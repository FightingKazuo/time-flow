import { useState, useEffect, useRef, useCallback } from "react";
import { notify, LS, pad } from "../constants";

const AUTO_STOP_SEC = 2 * 3600;
const LS_START_KEY  = "tf_timer_start";

export function useTimer({ categories, selectedCat, mode, pomoDuration, onAutoStop }) {
  const [elapsed,  setElapsed]  = useState(0);
  const [running,  setRunning]  = useState(false);

  const intervalRef     = useRef(null);
  const sessionStartRef = useRef(null);
  const wakeLockRef     = useRef(null);
  const stoppedRef      = useRef(false);

  const makeLogEntry = useCallback((durationSec) => {
    const sessionStart = sessionStartRef.current || new Date();
    const d = sessionStart;
    const dateStr = `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
    const startHour = d.getHours() + d.getMinutes() / 60;
    const cat = categories.find(c => c.id === selectedCat) || categories[0];
    return {
      id: Date.now(),
      date: dateStr,
      label: cat?.name || "",
      catId: selectedCat,
      duration: Math.min(durationSec, AUTO_STOP_SEC),
      mode,
      startHour,
    };
  }, [categories, selectedCat, mode]);

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

  const doAutoStop = useCallback((elapsed) => {
    if(stoppedRef.current) return;
    stoppedRef.current = true;
    clearInterval(intervalRef.current);
    releaseWakeLock();
    LS.set(LS_START_KEY, null);
    const entry = makeLogEntry(elapsed);
    setRunning(false);
    setElapsed(AUTO_STOP_SEC);
    if(onAutoStop) onAutoStop({ duration: AUTO_STOP_SEC, savedState: entry });
    sessionStartRef.current = null;
  }, [makeLogEntry, onAutoStop, releaseWakeLock]);

  // localStorage から復帰
  useEffect(() => {
    const saved = LS.get(LS_START_KEY, null);
    if(!saved) return;
    const wallStart = new Date(saved.wallStart);
    const nowSec    = Math.floor((Date.now() - wallStart.getTime()) / 1000);
    if(nowSec >= AUTO_STOP_SEC) {
      LS.set(LS_START_KEY, null);
      sessionStartRef.current = wallStart;
      if(onAutoStop) onAutoStop({
        duration: AUTO_STOP_SEC,
        savedState: {
          catId: saved.catId, mode: saved.mode,
          date: `${wallStart.getFullYear()}/${pad(wallStart.getMonth()+1)}/${pad(wallStart.getDate())}`,
          startHour: wallStart.getHours() + wallStart.getMinutes() / 60,
        }
      });
      sessionStartRef.current = null;
    } else {
      sessionStartRef.current = wallStart;
      stoppedRef.current = false;
      setElapsed(nowSec);
      setRunning(true);
    }
  }, []); // eslint-disable-line

  // Visibility change: 壁時計補正
  useEffect(() => {
    const onVisible = () => {
      if(document.visibilityState !== 'visible' || !running) return;
      if(!sessionStartRef.current) return;
      const ne = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
      if(ne >= AUTO_STOP_SEC) { doAutoStop(ne); return; }
      setElapsed(ne);
      acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [running, doAutoStop, acquireWakeLock]);

  // Main interval
  useEffect(() => {
    if(running) {
      stoppedRef.current = false;
      if(!sessionStartRef.current) sessionStartRef.current = new Date();
      acquireWakeLock();
      LS.set(LS_START_KEY, {
        wallStart:    sessionStartRef.current.toISOString(),
        base:         0,
        sessionStart: sessionStartRef.current.toISOString(),
        mode, catId: selectedCat,
      });
      intervalRef.current = setInterval(() => {
        if(!sessionStartRef.current) return;
        const ne = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
        if(ne >= AUTO_STOP_SEC) { doAutoStop(ne); return; }
        setElapsed(ne);
        if(mode === "pomodoro" && ne === pomoDuration * 60)
          notify("ポモドーロ完了！", `${pomoDuration}分経過！`);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      releaseWakeLock();
      if(!stoppedRef.current) LS.set(LS_START_KEY, null);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, pomoDuration, selectedCat]); // eslint-disable-line

  const start = () => setRunning(true);
  const pause = () => setRunning(false);

  const stop = (onSave) => {
    if(stoppedRef.current) return;
    stoppedRef.current = true;
    clearInterval(intervalRef.current);
    releaseWakeLock();
    LS.set(LS_START_KEY, null);
    const wallElapsed = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      : 0;
    const total = Math.min(wallElapsed, AUTO_STOP_SEC);
    if(total >= 5) onSave(makeLogEntry(total));
    sessionStartRef.current = null;
    setElapsed(0);
    setRunning(false);
  };

  return { elapsed, running, start, pause, stop };
}
