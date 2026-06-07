import { useState, useEffect, useRef, useCallback } from "react";
import { notify, todayStr, LS, pad } from "../constants";

const AUTO_STOP_SEC = 2 * 3600; // 2時間
const LS_START_KEY  = "tf_timer_start";   // { wallStart, base, sessionStart, mode, catId }

export function useTimer({ categories, selectedCat, mode, pomoDuration, onAutoStop }) {
  const [elapsed,  setElapsed]  = useState(0);
  const [running,  setRunning]  = useState(false);
  const intervalRef     = useRef(null);
  const startTimeRef    = useRef(null);   // Date.now() of last resume
  const baseElapsedRef  = useRef(0);
  const sessionStartRef = useRef(null);   // actual session start (Date object)
  const wakeLockRef     = useRef(null);

  // ── Restore from localStorage (app killed while running) ─────────────────
  useEffect(() => {
    const saved = LS.get(LS_START_KEY, null);
    if(saved) {
      const wallStart   = new Date(saved.wallStart);
      const nowSec      = Math.floor((Date.now() - wallStart.getTime()) / 1000);
      const totalSec    = saved.base + nowSec;

      if(totalSec >= AUTO_STOP_SEC) {
        // 2時間超えてたら復帰時点で自動停止通知
        LS.set(LS_START_KEY, null);
        if(onAutoStop) onAutoStop({ duration: totalSec, savedState: saved });
      } else {
        // 復帰して継続
        sessionStartRef.current = wallStart;
        baseElapsedRef.current  = saved.base;
        startTimeRef.current    = Date.now() - nowSec * 1000 + saved.base * 1000;
        setElapsed(totalSec);
        setRunning(true);
      }
    }
  }, []); // eslint-disable-line

  // ── Wake Lock ─────────────────────────────────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    if(!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
    } catch(e) {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    if(wakeLockRef.current) { wakeLockRef.current.release().catch(()=>{}); wakeLockRef.current = null; }
  }, []);

  // Re-acquire wake lock when app returns to foreground
  useEffect(() => {
    const onVisible = () => {
      if(document.visibilityState === 'visible' && running) acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [running, acquireWakeLock]);

  // ── Visibility correction (wall-clock diff) ───────────────────────────────
  useEffect(() => {
    const onVisible = () => {
      if(document.visibilityState !== 'visible' || !running) return;

      // Recalculate from session wall-clock start
      if(sessionStartRef.current) {
        const wallElapsed = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
        const corrected   = wallElapsed;

        // Auto-stop check
        if(corrected >= AUTO_STOP_SEC) {
          _forceStop(corrected);
          return;
        }

        // Correct display + restart interval
        clearInterval(intervalRef.current);
        baseElapsedRef.current = corrected;
        startTimeRef.current   = Date.now();
        setElapsed(corrected);

        intervalRef.current = setInterval(() => {
          const ne = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
          setElapsed(ne);
          if(ne >= AUTO_STOP_SEC) { _forceStop(ne); return; }
          if(mode === "pomodoro" && ne === pomoDuration * 60)
            notify("ポモドーロ完了！", `${pomoDuration}分経過！`);
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [running, mode, pomoDuration]);

  // ── Main interval ─────────────────────────────────────────────────────────
  const _forceStop = useCallback((total) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    releaseWakeLock();
    LS.set(LS_START_KEY, null);

    // 自動停止時も開始日付・最大2時間で保存
    const sessionStart = sessionStartRef.current;
    const cappedTotal = Math.min(total, AUTO_STOP_SEC);
    const startDate = sessionStart ? sessionStart : new Date();
    const dateStr = `${startDate.getFullYear()}/${pad(startDate.getMonth()+1)}/${pad(startDate.getDate())}`;
    const startHour = sessionStart
      ? sessionStart.getHours() + sessionStart.getMinutes() / 60
      : null;

    if(onAutoStop) onAutoStop({
      duration: cappedTotal,
      savedState: {
        catId: selectedCat, mode,
        sessionStart: sessionStart?.toISOString(),
        date: dateStr,
        startHour,
      }
    });
    setElapsed(cappedTotal);
    baseElapsedRef.current = cappedTotal;
  }, [onAutoStop, selectedCat, mode, releaseWakeLock]);

  useEffect(() => {
    if(running) {
      if(!sessionStartRef.current) sessionStartRef.current = new Date();
      startTimeRef.current = Date.now();
      acquireWakeLock();

      // Persist start info to localStorage
      LS.set(LS_START_KEY, {
        wallStart:    sessionStartRef.current.toISOString(),
        base:         baseElapsedRef.current,
        sessionStart: sessionStartRef.current.toISOString(),
        mode,
        catId:        selectedCat,
      });

      intervalRef.current = setInterval(() => {
        const ne = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
        setElapsed(ne);
        if(ne >= AUTO_STOP_SEC) { _forceStop(ne); return; }
        if(mode === "pomodoro" && ne === pomoDuration * 60)
          notify("ポモドーロ完了！", `${pomoDuration}分経過！`);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      if(startTimeRef.current) {
        baseElapsedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = null;
      }
      releaseWakeLock();
      LS.set(LS_START_KEY, null);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, pomoDuration, selectedCat]);

  const start = () => setRunning(true);
  const pause = () => { setRunning(false); };

  const stop = (onSave) => {
    setRunning(false);

    const sessionStart = sessionStartRef.current;

    // 実際の経過時間（wall-clock）、ただし2時間キャップ
    const wallElapsed = sessionStart
      ? Math.floor((Date.now() - sessionStart.getTime()) / 1000)
      : baseElapsedRef.current;
    const total = Math.min(wallElapsed, AUTO_STOP_SEC);

    if(total >= 5) {
      const cat = categories.find(c => c.id === selectedCat) || categories[0];

      // 日付は開始時刻の日付を使用（日をまたいでも開始日に記録）
      const startDate = sessionStart ? sessionStart : new Date();
      const dateStr = `${startDate.getFullYear()}/${pad(startDate.getMonth()+1)}/${pad(startDate.getDate())}`;
      const startHour = sessionStart
        ? sessionStart.getHours() + sessionStart.getMinutes() / 60
        : null;

      onSave({
        id: Date.now(),
        date: dateStr,          // ← 開始日付
        label: cat.name,
        catId: cat.id,
        duration: total,        // ← 最大2時間
        mode,
        startHour,
      });
    }

    setElapsed(0);
    baseElapsedRef.current  = 0;
    startTimeRef.current    = null;
    sessionStartRef.current = null;
    LS.set(LS_START_KEY, null);
  };

  return { elapsed, running, start, pause, stop };
}
