import { useState, useEffect, useRef } from "react";
import { notify, todayStr } from "../constants";

export function useTimer({ categories, selectedCat, mode, pomoDuration }) {
  const [elapsed,  setElapsed]  = useState(0);
  const [running,  setRunning]  = useState(false);
  const intervalRef    = useRef(null);
  const startTimeRef   = useRef(null);
  const baseElapsedRef = useRef(0);
  const sessionStartRef= useRef(null);

  useEffect(()=>{
    if(running){
      if(!sessionStartRef.current) sessionStartRef.current = new Date();
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(()=>{
        const ne = baseElapsedRef.current + Math.floor((Date.now()-startTimeRef.current)/1000);
        setElapsed(ne);
        if(mode==="pomodoro" && ne===pomoDuration*60)
          notify("ポモドーロ完了！",`${pomoDuration}分経過！`);
      }, 500);
    } else {
      clearInterval(intervalRef.current);
      if(startTimeRef.current){
        baseElapsedRef.current += Math.floor((Date.now()-startTimeRef.current)/1000);
        startTimeRef.current = null;
      }
    }
    return () => clearInterval(intervalRef.current);
  },[running, mode, pomoDuration]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);

  const stop = (onSave) => {
    setRunning(false);
    const total = baseElapsedRef.current;
    if(total >= 5){
      const cat = categories.find(c=>c.id===selectedCat) || categories[0];
      const startHour = sessionStartRef.current
        ? sessionStartRef.current.getHours() + sessionStartRef.current.getMinutes()/60
        : null;
      onSave({ id:Date.now(), date:todayStr(), label:cat.name, catId:cat.id, duration:total, mode, startHour });
    }
    setElapsed(0);
    baseElapsedRef.current = 0;
    startTimeRef.current   = null;
    sessionStartRef.current= null;
  };

  return { elapsed, running, start, pause, stop };
}
