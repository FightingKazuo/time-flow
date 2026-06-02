import { useEffect, useCallback } from "react";
import { LS, DAYS_LABEL, WEEKLY_DEFAULTS, getWeekMonday, buildWeeklyTasks, todayStr, todayDayIdx, pad, fmtDate, getDayDate } from "../constants";

const getWeekKey = () => {
  const m = getWeekMonday();
  return `${m.getFullYear()}-${pad(m.getMonth()+1)}-${pad(m.getDate())}`;
};
const getWeekLabel = () => {
  const m = getWeekMonday();
  const s = new Date(m); s.setDate(s.getDate()+6);
  return `${m.getFullYear()}.${m.getMonth()+1}.${pad(m.getDate())}（月）〜${s.getMonth()+1}.${pad(s.getDate())}（日）`;
};

export function useWeekReset({
  setWeeklyTasks, setCustomTasks, setLongTermTasks,
  setWeekHistory, weeklyTemplates, longTermTasks,
}) {
  const doWeekReset = useCallback(() => {
    const key = getWeekKey();
    const savedKey = LS.get("tf_currentWeekKey","");
    if(savedKey && savedKey !== key){
      const snapshot = {
        weekKey: savedKey,
        weekLabel: LS.get("tf_lastWeekLabel", savedKey),
        weeklyTasks: LS.get("tf_weeklyTasks",{}),
        customTasks:  LS.get("tf_customTasks",{}),
      };
      setWeekHistory(prev => {
        const next = [snapshot,...prev].slice(0,52);
        LS.set("tf_weekHistory", next);
        return next;
      });
      setWeeklyTasks(buildWeeklyTasks(LS.get("tf_weeklyTpls", WEEKLY_DEFAULTS)));
      setCustomTasks(Object.fromEntries(DAYS_LABEL.map((_,i)=>[i,[]])));
      setLongTermTasks(prev => prev.map(t=>({...t, addedToWeek:false})));
    }
    LS.set("tf_currentWeekKey", key);
    LS.set("tf_lastWeekLabel",  getWeekLabel());
  },[setWeeklyTasks, setCustomTasks, setLongTermTasks, setWeekHistory, weeklyTemplates]);

  const injectLongTermTasks = useCallback(() => {
    const mon = getWeekMonday();
    const sun = new Date(mon); sun.setDate(sun.getDate()+6); sun.setHours(23,59,59,999);
    setLongTermTasks(prev => {
      const toAdd = prev.filter(t =>
        !t.done && t.deadline && !t.addedToWeek &&
        (() => { const dl=new Date(t.deadline+"T00:00:00"); return dl>=mon&&dl<=sun; })()
      );
      if(!toAdd.length) return prev;
      const dayIdx = todayDayIdx();
      setCustomTasks(ct => {
        const next = {...ct};
        const existing = new Set((next[dayIdx]||[]).map(t=>t.label));
        const newTasks = toAdd
          .filter(t => !existing.has(t.label))
          .map(t => ({ id:`lt_${t.id}_${Date.now()}`, label:t.label, done:false, fromLongTerm:t.id, sticky:true }));
        if(newTasks.length) next[dayIdx] = [...(next[dayIdx]||[]), ...newTasks];
        return next;
      });
      return prev.map(t => toAdd.find(a=>a.id===t.id) ? {...t,addedToWeek:true} : t);
    });
  },[setLongTermTasks, setCustomTasks]);

  useEffect(()=>{
    doWeekReset();
    injectLongTermTasks();
    const id = setInterval(()=>{ doWeekReset(); injectLongTermTasks(); }, 60000);
    return () => clearInterval(id);
  },[doWeekReset, injectLongTermTasks]);

  return { injectLongTermTasks };
}
