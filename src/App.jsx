import { useState, useEffect } from "react";
import {
  DEFAULT_CATS, DAYS_LABEL, WEEKLY_DEFAULTS, BASE_FONT,
  pad, fmtTime, fmtHMS, fmtHM, fmtDate, todayStr, hexRgb,
  getDayDate, dayDateStr, todayDayIdx,
  buildWeeklyTasks, LS, notify, buildTheme, ACCENT_MAP, buildHeatColors,
} from "./constants";
import RingTimer          from "./components/RingTimer";
import TimelineBar        from "./components/TimelineBar";
import CategoryDial       from "./components/CategoryDial";
import TaskInput          from "./components/TaskInput";
import WeeklyProgress     from "./components/WeeklyProgress";
import DiaryListModal     from "./components/modals/DiaryListModal";
import EditLogModal       from "./components/modals/EditLogModal";
import CatManagerModal    from "./components/modals/CatManagerModal";
import BackupModal        from "./components/modals/BackupModal";
import WeekHistoryModal   from "./components/modals/WeekHistoryModal";
import LongTermModal      from "./components/modals/LongTermModal";
import WeeklyTemplateManager from "./components/modals/WeeklyTemplateManager";
import MoveTaskPopup      from "./components/modals/MoveTaskPopup";
import MonthlyTaskModal   from "./components/modals/MonthlyTaskModal";
import GoogleCalendarModal from "./components/modals/GoogleCalendarModal";
import { DIARY_COLORS }   from "./components/modals/DiaryModal";
import DiaryAnalysisModal from "./components/modals/DiaryAnalysisModal";
import { useTimer }       from "./hooks/useTimer";
import { useWeekReset }   from "./hooks/useWeekReset";

// ─── テーマを起動時に1回だけ確定 ────────────────────────────────────────────
const T = buildTheme();

// ─── body に背景色を即時反映（フラッシュ防止） ───────────────────────────────
document.body.style.background = T.bg;
document.body.style.color      = T.text;

// ─── Offline Banner ───────────────────────────────────────────────────────────
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(()=>{
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  },[]);
  if(!offline) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:1000,background:'#fb923c',color:'#fff',textAlign:'center',padding:'8px',fontSize:13,fontWeight:700}}>
      📡 オフライン中 — データはローカルに保存されています
    </div>
  );
}

export default function App() {
  const [tab,           setTab]           = useState("task");
  const [categories,    setCategories]    = useState(()=>LS.get("tf_categories",   DEFAULT_CATS));
  const [selectedCat,   setSelectedCat]   = useState(()=>LS.get("tf_selectedCat",  DEFAULT_CATS[0].id));
  const [studyCatId,    setStudyCatId]    = useState(()=>LS.get("tf_studyCatId",   "study"));
  const [showCatMgr,    setShowCatMgr]    = useState(false);
  const [showBackup,    setShowBackup]    = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [showWeeklyMgr, setShowWeeklyMgr] = useState(false);
  const [weeklyTemplates, setWeeklyTemplates] = useState(()=>LS.get("tf_weeklyTpls", WEEKLY_DEFAULTS));
  const [longTermTasks,   setLongTermTasks]   = useState(()=>LS.get("tf_longTerm", []));
  const [showLongTerm,    setShowLongTerm]    = useState(false);
  const [monthlyTasks,    setMonthlyTasks]    = useState(()=>LS.get("tf_monthlyTasks", []));
  const [showMonthly,     setShowMonthly]     = useState(false);
  const [calendarEvents,  setCalendarEvents]  = useState(()=>LS.get("tf_calEvents", []));
  const [showGoogleCal,   setShowGoogleCal]   = useState(false);
  const [splash,          setSplash]          = useState(true);
  const [weekHistory,     setWeekHistory]     = useState(()=>LS.get("tf_weekHistory", []));
  const [showWeekHistory, setShowWeekHistory] = useState(false);
  const [weeklyTasks,  setWeeklyTasks]  = useState(()=>LS.get("tf_weeklyTasks",  buildWeeklyTasks(WEEKLY_DEFAULTS)));
  const [customTasks,  setCustomTasks]  = useState(()=>LS.get("tf_customTasks",  Object.fromEntries(DAYS_LABEL.map((_,i)=>[i,[]]))));
  const [addingDay,    setAddingDay]    = useState(null);
  const [movePopup,    setMovePopup]    = useState(null);
  const [mode,         setMode]         = useState("timer");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [logs,         setLogs]         = useState(()=>LS.get("tf_logs", []));
  const [editingLog,   setEditingLog]   = useState(null);
  const [diaries,      setDiaries]      = useState(()=>LS.get("tf_diaries", {}));
  const [diaryModal,   setDiaryModal]   = useState(null);
  const [showDiaryList,    setShowDiaryList]    = useState(false);
  const [showDiaryAnalysis, setShowDiaryAnalysis] = useState(false);
  const [goalHours,    setGoalHours]    = useState(()=>LS.get("tf_goalHours", 10));
  const [logSelectedDay, setLogSelectedDay] = useState(todayDayIdx());
  const [autoStopInfo,   setAutoStopInfo]   = useState(null);

  useEffect(()=>{ const t=setTimeout(()=>setSplash(false), 2000); return ()=>clearTimeout(t); }, []);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { elapsed, running, start: timerStart, pause: timerPause, stop: timerStop } = useTimer({
    categories, selectedCat, mode, pomoDuration,
    onAutoStop: (info) => {
      setAutoStopInfo(info);
      setTab("log");
      notify("⏱ タイマー自動停止", "2時間を超えたため自動停止しました。");
    },
  });
  const pomoDone = mode==="pomodoro" && elapsed>=pomoDuration*60;

  useWeekReset({ setWeeklyTasks, setCustomTasks, setLongTermTasks, setWeekHistory, weeklyTemplates });

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(()=>LS.set("tf_categories",   categories),   [categories]);
  useEffect(()=>LS.set("tf_selectedCat",  selectedCat),  [selectedCat]);
  useEffect(()=>LS.set("tf_weeklyTasks",  weeklyTasks),  [weeklyTasks]);
  useEffect(()=>LS.set("tf_customTasks",  customTasks),  [customTasks]);
  useEffect(()=>LS.set("tf_logs",         logs),         [logs]);
  useEffect(()=>LS.set("tf_diaries",      diaries),      [diaries]);
  useEffect(()=>LS.set("tf_longTerm",     longTermTasks),[longTermTasks]);
  useEffect(()=>LS.set("tf_monthlyTasks", monthlyTasks), [monthlyTasks]);
  useEffect(()=>LS.set("tf_calEvents",    calendarEvents),[calendarEvents]);
  useEffect(()=>LS.set("tf_studyCatId",   studyCatId),   [studyCatId]);
  useEffect(()=>LS.set("tf_weekHistory",  weekHistory),  [weekHistory]);

  useEffect(()=>{
    if("Notification" in window && Notification.permission==="default")
      Notification.requestPermission();
  },[]);

  // ── ヘルパー ──────────────────────────────────────────────────────────────
  const handleStop = () => { timerStop(log=>setLogs(p=>[log,...p])); };
  const saveDiary  = (date, value) => setDiaries(p=>({...p,[date]:value}));
  const getDiaryText = d => typeof d==="object" ? d?.text : d;

  const catColor       = categories.find(c=>c.id===selectedCat)?.color || T.accent;
  const todayTotal     = logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  const todayStudyTotal= logs.filter(l=>l.date===todayStr()&&l.catId===studyCatId).reduce((s,l)=>s+l.duration,0);

  const saveWeeklyTemplates = (tpls) => {
    setWeeklyTemplates(tpls);
    LS.set("tf_weeklyTpls", tpls);
    setWeeklyTasks(prev => {
      const next = buildWeeklyTasks(tpls);
      DAYS_LABEL.forEach((_,i)=>{
        next[i] = next[i].map(t=>{
          const old=(prev[i]||[]).find(o=>o.id===t.id);
          return old?{...t,done:old.done}:t;
        });
      });
      return next;
    });
    setShowWeeklyMgr(false);
  };

  const toggleTask = (dayIdx,id,weekly) => {
    if(weekly) {
      setWeeklyTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
    } else {
      setCustomTasks(p=>{
        const next = {...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)};
        const task = next[dayIdx].find(t=>t.id===id);
        if(task?.fromLongTerm) {
          setLongTermTasks(prev=>prev.map(lt=>
            lt.id===task.fromLongTerm
              ? {...lt, done:task.done, doneAt:task.done?todayStr():null}
              : lt
          ));
        }
        return next;
      });
    }
  };

  const moveTask = toDay => {
    if(!movePopup) return;
    const {task,fromDay} = movePopup;
    if(task.weekly) setWeeklyTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    else            setCustomTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    setCustomTasks(p=>({...p,[toDay]:[...p[toDay],{...task,id:Date.now(),weekly:false}]}));
    setMovePopup(null);
  };

  // ── スタイル定数 ──────────────────────────────────────────────────────────
  const S = {
    app:   {minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Noto Sans JP',sans-serif",fontSize:BASE_FONT,display:"flex",flexDirection:"column"},
    header:{padding:"14px 16px 0",borderBottom:`1px solid ${T.border}`,background:T.bg},
    tabs:  {display:"flex",gap:2,marginTop:10},
    tab:   a=>({flex:1,padding:"10px 0",fontSize:BASE_FONT-1,fontWeight:700,border:"none",borderBottom:a?`2px solid ${T.accent}`:"2px solid transparent",background:a?T.accentBg:"transparent",color:a?T.accent:T.sub,cursor:"pointer",transition:"all 0.2s",borderRadius:"8px 8px 0 0"}),
    body:  {flex:1,padding:"12px 12px",overflowY:"auto"},
    card:  {background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:12,marginBottom:10,boxShadow:T.shadow},
    input: {background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.text,fontSize:BASE_FONT,outline:"none",flex:1},
    btn:   (bg=T.accent)=>({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:BASE_FONT-1,fontWeight:700,cursor:"pointer"}),
    btnSm: (a,c)=>({padding:"5px 10px",fontSize:BASE_FONT-2,fontWeight:700,border:`1px solid ${a?c:T.border}`,borderRadius:20,background:a?`rgba(${hexRgb(c)},0.2)`:"transparent",color:a?c:T.sub,cursor:"pointer"}),
  };

  // ── Task Tab ──────────────────────────────────────────────────────────────
  const TaskTab = () => {
    const mobile = window.innerWidth < 640;
    return (
      <div>
        {/* タイムライン */}
        <div style={{...S.card,background:T.card2,borderColor:T.isDark?"rgba(79,142,247,0.2)":T.border}}>
          <TimelineBar logs={logs} categories={categories} date={todayStr()} theme={T}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
            <div>
              <div style={{fontSize:10,color:T.sub}}>今日の合計</div>
              <div style={{fontSize:20,fontWeight:800,color:T.accent,fontFamily:"monospace"}}>{fmtTime(todayTotal)}</div>
              <div style={{fontSize:10,color:T.sub}}>{fmtHMS(todayTotal)}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowDiaryList(true)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",color:T.sub,fontSize:BASE_FONT-1,fontWeight:600,boxShadow:T.shadow}}>📔 一覧</button>
              <button onClick={()=>setDiaryModal(todayStr())} style={{
                background:getDiaryText(diaries[todayStr()])?"rgba(251,191,36,0.15)":T.card,
                border:`1px solid ${getDiaryText(diaries[todayStr()])?"#fbbf24":T.border}`,
                borderRadius:8,padding:"7px 10px",cursor:"pointer",
                color:getDiaryText(diaries[todayStr()])?"#fbbf24":T.sub,
                fontSize:BASE_FONT-1,fontWeight:600,boxShadow:T.shadow,
              }}>
                {getDiaryText(diaries[todayStr()])?"📔 今日":"✏️ 日記"}
              </button>
            </div>
          </div>
        </div>

        <div style={{fontSize:BASE_FONT,fontWeight:800,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📋 今週のタスク</span>
          <button onClick={()=>setShowWeekHistory(true)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",color:T.sub,cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700,boxShadow:T.shadow}}>
            📅 週間履歴
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((day,i)=>{
            const wt=weeklyTasks[i]||[], ct=customTasks[i]||[], all=[...wt,...ct];
            const done=all.filter(t=>t.done).length, isToday=i===todayDayIdx();
            const dayDate = fmtDate(getDayDate(i));
            const hasDiary = getDiaryText(diaries[dayDate])?.trim();
            return (
              <div key={i} style={{
                ...S.card, padding:10,
                borderColor:isToday?T.accent:T.border,
                background:isToday?`rgba(${hexRgb(T.accent)},0.04)`:T.card,
                boxShadow:isToday?`0 0 0 1.5px ${T.accent}22, ${T.shadow}`:T.shadow,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:BASE_FONT-1,fontWeight:800,color:isToday?T.accent:T.sub}}>{day}</span>
                    <span style={{fontSize:10,color:`${T.sub}88`}}>{dayDateStr(i)}</span>
                    <button onClick={()=>setDiaryModal(dayDate)} style={{
                      background:hasDiary?"rgba(251,191,36,0.15)":T.card2,
                      border:`1.5px solid ${hasDiary?"#fbbf24":T.border}`,
                      borderRadius:8,padding:"3px 8px",cursor:"pointer",
                      fontSize:11,fontWeight:800,
                      color:hasDiary?"#fbbf24":T.sub,lineHeight:"18px",
                    }}>
                      {hasDiary?"📔":"＋日記"}
                    </button>
                  </div>
                  {all.length>0&&<span style={{fontSize:9,fontWeight:700,color:done===all.length?"#34d399":T.sub}}>{done}/{all.length}</span>}
                </div>

                {all.length===0&&<div style={{fontSize:10,color:`${T.sub}88`,textAlign:"center",padding:"4px 0"}}>—</div>}

                {/* カレンダー予定 */}
                {(()=>{
                  const d  = getDayDate(i);
                  const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                  return (calendarEvents||[]).filter(e=>e.date===ds).map(e=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 6px",marginBottom:3,background:"rgba(66,133,244,0.08)",borderRadius:6,border:"1px solid rgba(66,133,244,0.2)"}}>
                      <span style={{fontSize:10,flexShrink:0}}>📅</span>
                      <span style={{fontSize:BASE_FONT-3,color:"#4285f4",fontWeight:600,flex:1,lineHeight:1.3}}>{e.title}</span>
                      {e.time&&<span style={{fontSize:9,color:T.sub,flexShrink:0}}>{e.time}</span>}
                    </div>
                  ));
                })()}

                {all.map(task=>(
                  <div key={task.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 0",borderBottom:`1px solid ${T.border}`,opacity:task.done?0.45:1}}>
                    <button onClick={()=>setMovePopup({task,fromDay:i})} style={{background:"none",border:"none",color:`${T.sub}88`,fontSize:14,flexShrink:0,cursor:"pointer",padding:"1px 2px",lineHeight:1}} title="移動">⇄</button>
                    <div onClick={()=>toggleTask(i,task.id,task.weekly)} style={{width:14,height:14,borderRadius:4,flexShrink:0,border:`2px solid ${task.done?"#34d399":T.muted}`,background:task.done?"#34d399":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {task.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                    </div>
                    <span style={{fontSize:BASE_FONT-1,flex:1,lineHeight:1.3}}>{task.label}</span>
                    {task.weekly&&<span style={{fontSize:9,background:"rgba(79,142,247,0.12)",color:T.accent,borderRadius:4,padding:"1px 4px",flexShrink:0}}>毎週</span>}
                    {task.fromLongTerm&&<span style={{fontSize:9,background:"rgba(251,146,60,0.12)",color:"#fb923c",borderRadius:4,padding:"1px 4px",flexShrink:0}}>📌</span>}
                    {!task.weekly&&<button onClick={()=>setCustomTasks(p=>({...p,[i]:p[i].filter(x=>x.id!==task.id)}))} style={{background:"none",border:"none",color:`${T.sub}88`,fontSize:13,flexShrink:0,cursor:"pointer",padding:"1px 3px",lineHeight:1}}>✕</button>}
                  </div>
                ))}

                {addingDay===i
                  ?<TaskInput onAdd={label=>{ setCustomTasks(p=>({...p,[i]:[...p[i],{id:Date.now(),label,done:false}]})); setAddingDay(null); }} onCancel={()=>setAddingDay(null)} inputStyle={{...S.input,fontSize:BASE_FONT-1,padding:"5px 8px"}} btnStyle={S.btn}/>
                  :<button onClick={()=>setAddingDay(i)} style={{width:"100%",background:"none",border:`1px dashed ${T.border}`,borderRadius:6,padding:"5px 0",color:`${T.sub}88`,cursor:"pointer",fontSize:16,marginTop:6}}>+</button>
                }
              </div>
            );
          })}
        </div>

        <button onClick={()=>setShowWeeklyMgr(true)} style={{width:"100%",background:"rgba(79,142,247,0.06)",border:`1px solid rgba(79,142,247,${T.isDark?"0.2":"0.25"})`,borderRadius:10,padding:"12px 0",color:T.accent,cursor:"pointer",fontSize:BASE_FONT-1,fontWeight:700,marginTop:4,boxShadow:T.shadow}}>
          ⚙ 毎週タスクを編集
        </button>
        <button onClick={()=>setShowMonthly(true)} style={{width:"100%",background:"rgba(167,139,250,0.06)",border:`1px solid rgba(167,139,250,${T.isDark?"0.2":"0.3"})`,borderRadius:10,padding:"10px 0",color:"#a78bfa",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,marginTop:8,boxShadow:T.shadow}}>
          🗓 マンスリータスク
        </button>

        {/* 長期タスク */}
        <div style={{marginTop:16,borderTop:`1px dashed ${T.border}`,paddingTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:BASE_FONT,fontWeight:800}}>📌 長期タスク</div>
              <div style={{fontSize:11,color:T.sub}}>週をまたいで管理</div>
            </div>
            <button onClick={()=>setShowLongTerm(true)} style={{background:"rgba(251,146,60,0.1)",border:`1px solid rgba(251,146,60,${T.isDark?"0.3":"0.4"})`,borderRadius:8,padding:"7px 14px",color:"#fb923c",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,boxShadow:T.shadow}}>
              編集 / 追加
            </button>
          </div>
          {longTermTasks.filter(t=>!t.done).length===0
            ?<div style={{textAlign:"center",color:`${T.sub}88`,fontSize:BASE_FONT-2,padding:"10px 0"}}>タスクなし　→「編集 / 追加」から追加できます</div>
            :longTermTasks.filter(t=>!t.done).map(task=>(
              <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:T.card,borderRadius:8,marginBottom:6,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
                <div onClick={()=>setLongTermTasks(p=>p.map(x=>x.id===task.id?{...x,done:true,doneAt:todayStr()}:x))} style={{width:18,height:18,borderRadius:4,flexShrink:0,border:"2px solid #fb923c",background:"transparent",cursor:"pointer"}}/>
                <span style={{fontSize:BASE_FONT-1,flex:1}}>{task.label}</span>
                <span style={{fontSize:10,color:`${T.sub}88`}}>{task.createdAt}</span>
              </div>
            ))
          }
          {longTermTasks.filter(t=>t.done).length>0&&(
            <div style={{fontSize:11,color:"#34d399",textAlign:"right",marginTop:4}}>
              ✓ 完了済み {longTermTasks.filter(t=>t.done).length}件
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Timer Tab ─────────────────────────────────────────────────────────────
  const TimerTab = () => {
    const studyCatName = categories.find(c=>c.id===studyCatId)?.name || "勉強";
    return (
      <div style={running?{position:"fixed",inset:0,zIndex:88,background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}:{maxWidth:440,margin:"0 auto"}}>
        {!running&&(
          <>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
              {["timer","pomodoro"].map(m=><button key={m} style={S.btnSm(mode===m,T.accent)} onClick={()=>setMode(m)}>{m==="timer"?"⏱ タイマー":"🍅 ポモドーロ"}</button>)}
            </div>
            <CategoryDial categories={categories} selected={selectedCat} onSelect={setSelectedCat} disabled={false} theme={T}/>
            <div style={{textAlign:"center",marginBottom:10}}>
              <button style={{background:"none",border:"none",color:`${T.sub}88`,fontSize:BASE_FONT-2,cursor:"pointer"}} onClick={()=>setShowCatMgr(true)}>⚙ カテゴリーを管理</button>
            </div>
            {mode==="pomodoro"&&(
              <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {[15,25,45,60].map(m=><button key={m} style={S.btnSm(pomoDuration===m,"#fb923c")} onClick={()=>setPomoDuration(m)}>{m}分</button>)}
              </div>
            )}
          </>
        )}

        <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
          <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={running} color={catColor} theme={T}/>
        </div>

        {mode==="timer"&&(
          <div style={{textAlign:"center",marginBottom:10}}>
            <div style={{fontSize:BASE_FONT-2,color:T.sub,marginBottom:2}}>今日の{studyCatName}時間</div>
            <div style={{fontSize:20,fontWeight:900,color:T.accent,fontFamily:"monospace"}}>{fmtHMS(todayStudyTotal)||"0秒"}</div>
            <div style={{fontSize:BASE_FONT-3,color:`${T.sub}88`,marginTop:2}}>
              1セッション最大 2時間
              {running&&<span style={{marginLeft:8,color:elapsed>=3600?"#fb923c":T.sub}}>残り {fmtHM(Math.max(2*3600-elapsed,0))}</span>}
            </div>
          </div>
        )}

        {pomoDone&&<div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:10,padding:10,textAlign:"center",marginBottom:12,fontSize:BASE_FONT,color:"#34d399",fontWeight:700}}>🎉 {pomoDuration}分完了！計測は継続中</div>}
        {running&&(
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:BASE_FONT-1,color:T.sub}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"center",gap:10}}>
          {!running
            ?<button style={{...S.btn("#34d399"),padding:"14px 48px",fontSize:16,borderRadius:50}} onClick={()=>{timerStart();setTab("timer");}}>▶ 開始</button>
            :<>
              <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={timerPause}>⏸ 一時停止</button>
              <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={handleStop}>■ 終了・記録</button>
            </>
          }
        </div>
        {!running&&elapsed>0&&<div style={{textAlign:"center",marginTop:12,color:T.sub,fontSize:BASE_FONT-1}}>経過: <span style={{color:T.text,fontWeight:700,fontFamily:"monospace"}}>{fmtTime(elapsed)}</span> ({fmtHMS(elapsed)})</div>}
      </div>
    );
  };

  // ── Diary Screen ──────────────────────────────────────────────────────────
  const DiaryScreen = () => {
    const [editDate, setEditDate] = useState(diaryModal||todayStr());
    const [text,  setText]  = useState(()=>{ const d=diaries[diaryModal||todayStr()]; return typeof d==="object"?d?.text||"":d||""; });
    const [color, setColor] = useState(()=>{ const d=diaries[diaryModal||todayStr()]; return typeof d==="object"?d?.color||"none":"none"; });
    const [saved, setSaved] = useState(false);
    const [listMode, setListMode] = useState(false);

    const loadDate = (date) => {
      setEditDate(date);
      const d = diaries[date];
      setText(typeof d==="object"?d?.text||"":d||"");
      setColor(typeof d==="object"?d?.color||"none":"none");
      setSaved(false);
      setListMode(false);
    };
    const save = () => { saveDiary(editDate, {text, color}); setSaved(true); setTimeout(()=>setSaved(false), 2000); };
    const selColor = DIARY_COLORS.find(c=>c.id===color)||DIARY_COLORS[0];
    const entries  = Object.entries(diaries)
      .filter(([,d])=>getDiaryText(d)?.trim())
      .sort((a,b)=>b[0].localeCompare(a[0]));

    return (
      <div style={{position:"fixed",inset:0,zIndex:200,background:T.bg,display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{position:"sticky",top:0,zIndex:10,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setDiaryModal(null)} style={{background:"none",border:"none",color:T.sub,fontSize:22,cursor:"pointer",padding:"0 6px",lineHeight:1}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:BASE_FONT+1,fontWeight:800,color:color!=="none"?selColor.color:T.text}}>📔 日記</div>
            <div style={{fontSize:11,color:T.sub}}>{editDate}</div>
          </div>
          <button onClick={()=>setListMode(v=>!v)} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",color:T.sub,cursor:"pointer",fontSize:BASE_FONT-2,boxShadow:T.shadow}}>{listMode?"✏️ 編集":"📋 一覧"}</button>
          {!listMode&&<button onClick={save} style={{background:saved?"#34d399":T.accent,border:"none",borderRadius:8,padding:"8px 18px",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:BASE_FONT,transition:"background 0.3s"}}>{saved?"✓ 保存済":"保存"}</button>}
        </div>

        <div style={{padding:"16px",flex:1}}>
          {listMode ? (
            <div>
              {entries.length===0&&<div style={{textAlign:"center",color:`${T.sub}88`,padding:40}}>日記がまだありません</div>}
              {entries.map(([date,d])=>{
                const txt = getDiaryText(d);
                const dc  = DIARY_COLORS.find(c=>c.id===(typeof d==="object"?d?.color||"none":"none"));
                return (
                  <div key={date} onClick={()=>loadDate(date)} style={{padding:"16px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{width:5,borderRadius:2,alignSelf:"stretch",background:dc&&dc.id!=="none"?dc.color:T.border,flexShrink:0,minHeight:44}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:BASE_FONT-1,fontWeight:700,color:dc?.color||T.sub,marginBottom:5}}>{date}</div>
                      <div style={{fontSize:BASE_FONT,color:T.text,lineHeight:1.6}}>{txt?.trim().split("\n")[0]?.slice(0,80)||""}</div>
                    </div>
                    <span style={{color:`${T.sub}88`,fontSize:16,paddingTop:2}}>›</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea value={text} onChange={e=>setText(e.target.value)}
                placeholder={`${editDate} の日記を書く...\n\nここをタップして入力`}
                style={{width:"100%",boxSizing:"border-box",height:"52vh",background:T.card,border:`2px solid ${color!=="none"?selColor.color+"66":T.border}`,borderRadius:12,padding:16,color:T.text,fontSize:BASE_FONT-1,resize:"none",outline:"none",lineHeight:1.9,fontFamily:"inherit",display:"block",marginBottom:14,boxShadow:T.shadow}}/>
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {DIARY_COLORS.map(c=>(
                  <button key={c.id} onClick={()=>setColor(c.id)} style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${color===c.id?c.color:T.border}`,background:color===c.id?`${c.color}22`:"transparent",color:color===c.id?c.color:T.sub,cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700}}>{c.label}</button>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:BASE_FONT-2,color:T.sub,flexShrink:0}}>日付：</span>
                <input type="date" value={editDate.replace(/\//g,"-")} onChange={e=>loadDate(e.target.value.replace(/-/g,"/"))}
                  style={{flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontSize:BASE_FONT-1,outline:"none",colorScheme:T.isDark?"dark":"light"}}/>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Settings Screen ───────────────────────────────────────────────────────
  const SettingsScreen = () => {
    const [editGoal, setEditGoal] = useState(false);
    const [gInput,   setGInput]   = useState(String(goalHours));
    const ACCENT_COLORS = Object.entries(ACCENT_MAP).map(([id,color])=>({
      id, color,
      label:{blue:"ブルー",green:"グリーン",purple:"パープル",orange:"オレンジ",amber:"アンバー",pink:"ピンク"}[id],
    }));
    const [accent, setAccentLocal] = useState(LS.get("tf_accent","blue"));
    const [bgMode, setBgModeLocal] = useState(LS.get("tf_bgmode","dark"));
    const applyTheme = (a, b) => { LS.set("tf_accent",a); LS.set("tf_bgmode",b); window.location.reload(); };
    const curAccentColor = ACCENT_MAP[accent] || T.accent;

    return (
      <div style={{position:"fixed",inset:0,zIndex:300,background:T.bg,display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{position:"sticky",top:0,zIndex:10,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowSettings(false)} style={{background:"none",border:"none",color:T.sub,fontSize:22,cursor:"pointer",padding:"0 6px",lineHeight:1}}>←</button>
          <div style={{fontSize:BASE_FONT+1,fontWeight:800}}>⚙️ 設定</div>
        </div>

        <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>

          {/* テーマ設定 */}
          <div style={{...S.card}}>
            <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:T.sub,marginBottom:12}}>🎨 テーマ設定</div>
            <div style={{fontSize:BASE_FONT-2,color:T.sub,marginBottom:8}}>背景</div>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              {[{id:"dark",label:"🌙 ダーク"},{id:"light",label:"☀️ ライト"}].map(m=>(
                <button key={m.id} onClick={()=>setBgModeLocal(m.id)} style={{flex:1,padding:"10px 0",borderRadius:10,cursor:"pointer",border:`2px solid ${bgMode===m.id?curAccentColor:T.border}`,background:bgMode===m.id?`${curAccentColor}18`:"transparent",color:bgMode===m.id?T.text:T.sub,fontSize:BASE_FONT-2,fontWeight:700}}>{m.label}</button>
              ))}
            </div>
            <div style={{fontSize:BASE_FONT-2,color:T.sub,marginBottom:8}}>アクセントカラー</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {ACCENT_COLORS.map(a=>(
                <button key={a.id} onClick={()=>setAccentLocal(a.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"10px 12px",borderRadius:12,cursor:"pointer",flex:1,minWidth:55,border:`2px solid ${accent===a.id?a.color:T.border}`,background:accent===a.id?`${a.color}18`:"transparent"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:a.color,boxShadow:accent===a.id?`0 0 10px ${a.color}`:"none"}}/>
                  <span style={{fontSize:9,color:accent===a.id?a.color:T.sub,fontWeight:700}}>{a.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>applyTheme(accent,bgMode)} style={{width:"100%",padding:"12px 0",borderRadius:10,background:curAccentColor,border:"none",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:BASE_FONT}}>✓ テーマを適用</button>
          </div>

          {/* 勉強目標 */}
          <div style={{...S.card}}>
            <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:T.sub,marginBottom:12}}>📊 勉強目標</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:BASE_FONT-2,color:T.sub}}>目標カテゴリー</span>
              <select value={studyCatId} onChange={e=>setStudyCatId(e.target.value)} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",color:T.text,fontSize:BASE_FONT-2,outline:"none"}}>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:BASE_FONT-2,color:T.sub}}>週間目標時間</span>
              {editGoal
                ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input style={{...S.input,width:60,textAlign:"center"}} type="number" min="1" max="168" value={gInput} onChange={e=>setGInput(e.target.value)}/>
                  <span style={{color:T.sub,fontSize:BASE_FONT-2}}>時間</span>
                  <button style={S.btn()} onClick={()=>{setGoalHours(Math.max(1,Number(gInput)));setEditGoal(false);}}>✓</button>
                </div>
                :<div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:"monospace",fontSize:16,fontWeight:800,color:"#34d399"}}>{goalHours}h</span>
                  <button style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",fontSize:BASE_FONT-2,color:T.text,cursor:"pointer",fontWeight:700}} onClick={()=>setEditGoal(true)}>変更</button>
                </div>
              }
            </div>
          </div>

          {/* Googleカレンダー */}
          <div style={{...S.card}}>
            <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:T.sub,marginBottom:12}}>📅 Googleカレンダー</div>
            <button onClick={()=>{setShowSettings(false);setShowGoogleCal(true);}} style={{width:"100%",background:"rgba(66,133,244,0.08)",border:"1px solid rgba(66,133,244,0.25)",borderRadius:10,padding:"12px 0",color:"#4285f4",cursor:"pointer",fontSize:BASE_FONT-1,fontWeight:700}}>
              Googleカレンダーを同期
            </button>
          </div>

          <div style={{textAlign:"center",padding:16}}>
            <div style={{fontSize:12,color:`${T.sub}88`}}>TimeFlow v2.8.5</div>
          </div>
        </div>
      </div>
    );
  };

  // ── Log Tab ───────────────────────────────────────────────────────────────
  const LogTab = () => {
    const [showList, setShowList] = useState(false);
    const [tooltip,  setTooltip]  = useState(null);
    const now  = new Date();
    const year = now.getFullYear();

    const dateMap = {};
    logs.filter(l=>l.catId===studyCatId).forEach(l=>{ dateMap[l.date]=(dateMap[l.date]||0)+l.duration; });
    const yearTotal = Object.entries(dateMap).filter(([d])=>d.startsWith(String(year))).reduce((s,[,v])=>s+v,0);

    const getColor = (sec) => {
      const hc = T.heatColors;
      if(!sec)       return hc[0];
      const m = sec/60;
      if(m < 20)     return hc[1];
      if(m < 40)     return hc[2];
      if(m < 60)     return hc[3];
      if(m < 90)     return hc[4];
      return hc[5];
    };

    const jan1  = new Date(year, 0, 1);
    const weeks = [];
    let cur = new Date(jan1);
    cur.setDate(cur.getDate() - jan1.getDay());
    while(cur.getFullYear() <= year) {
      const week = [];
      for(let d=0;d<7;d++){ week.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
      weeks.push(week);
      if(cur.getFullYear() > year && cur.getMonth() > 0) break;
    }
    const fmt = d => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
    const CELL=13, GAP=3;
    const DAY_LABELS   = ["日","月","火","水","木","金","土"];
    const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
    const HEAT_COLORS = T.heatColors;

    const byDate = {};
    logs.forEach(l=>{ if(!byDate[l.date]) byDate[l.date]=[]; byDate[l.date].push(l); });
    const dates = Object.keys(byDate).sort().reverse();

    return (
      <div>
        <WeeklyProgress weeklyTasks={weeklyTasks} customTasks={customTasks} logs={logs} diaries={diaries} goalHours={goalHours} onSelectDay={setLogSelectedDay} selectedDay={logSelectedDay} studyCatId={studyCatId} theme={T}/>

        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={()=>setShowList(v=>!v)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`1px solid ${showList?T.accent:T.border}`,background:showList?`rgba(79,142,247,${T.isDark?"0.12":"0.08"})`:T.card,color:showList?T.accent:T.sub,fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2,boxShadow:T.shadow}}>
            📋 詳細記録 {showList?"▲":"▼"}
          </button>
          <button onClick={()=>setShowDiaryList(true)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #fbbf2440",background:"rgba(251,191,36,0.08)",color:"#fbbf24",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2,boxShadow:T.shadow}}>
            📔
          </button>
          <button onClick={()=>setShowDiaryAnalysis(true)} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.accent}44`,background:`rgba(79,142,247,0.08)`,color:T.accent,fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2,boxShadow:T.shadow}}>
            ✨
          </button>
        </div>

        {showList&&(
          <div style={{marginBottom:16}}>
            {logs.length===0&&<div style={{textAlign:"center",color:T.sub,padding:40,fontSize:BASE_FONT}}>記録がありません。</div>}
            {dates.map(date=>{
              const dl=byDate[date], total=dl.reduce((s,l)=>s+l.duration,0);
              const byCat={};
              dl.forEach(l=>{ byCat[l.catId]=(byCat[l.catId]||0)+l.duration; });
              return (
                <div key={date} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:BASE_FONT,fontWeight:800,color:T.accent}}>{date}</span>
                      {getDiaryText(diaries[date])?.trim()&&<button onClick={()=>setDiaryModal(date)} style={{background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf24",borderRadius:6,padding:"2px 7px",color:"#fbbf24",fontSize:10,cursor:"pointer",fontWeight:700}}>📔</button>}
                    </div>
                    <span style={{fontSize:BASE_FONT-1,color:"#34d399",fontWeight:700}}>{fmtHMS(total)}</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:T.card2,display:"flex",overflow:"hidden",marginBottom:8}}>
                    {Object.entries(byCat).map(([cid,dur])=>{ const cat=categories.find(c=>c.id===cid); return <div key={cid} style={{width:`${(dur/86400)*100}%`,background:cat?.color||T.sub,minWidth:dur>60?2:0}}/>; })}
                  </div>
                  {dl.map(l=>{
                    const cat = categories.find(c=>c.id===l.catId);
                    return (
                      <div key={l.id} style={{...S.card,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:6}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:cat?.color||T.sub,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:BASE_FONT,fontWeight:700}}>{l.label}</div>
                          <div style={{fontSize:10,color:T.sub,marginTop:1}}>{l.mode==="pomodoro"?"🍅":"⏱"}{cat&&<span style={{marginLeft:4,color:cat.color}}>#{cat.name}</span>}{l.startHour!=null&&<span style={{marginLeft:6,color:`${T.sub}88`}}>{Math.floor(l.startHour)}:{pad(Math.round((l.startHour%1)*60))}〜</span>}</div>
                        </div>
                        <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:T.text,textAlign:"right"}}>
                          <div style={{fontFamily:"monospace"}}>{fmtTime(l.duration)}</div>
                          <div style={{fontSize:10,color:T.sub}}>{fmtHMS(l.duration)}</div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <button style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:5,padding:"3px 8px",color:T.sub,cursor:"pointer",fontSize:10}} onClick={()=>setEditingLog(l)}>編集</button>
                          <button style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:5,padding:"3px 8px",color:"#f87171",cursor:"pointer",fontSize:10}} onClick={()=>setLogs(p=>p.filter(x=>x.id!==l.id))}>削除</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ヒートマップ */}
        <div style={{...S.card,background:T.card2,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:11,color:T.sub}}>📊 {year}年 年間{categories.find(c=>c.id===studyCatId)?.name||"勉強"}時間</div>
              <div style={{fontSize:28,fontWeight:900,color:T.accent,fontFamily:"monospace"}}>{fmtHM(yearTotal)||"0m"}</div>
              <div style={{fontSize:11,color:T.sub}}>{fmtHMS(yearTotal)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:T.sub}}>記録日数</div>
              <div style={{fontSize:22,fontWeight:800,color:"#34d399"}}>{Object.keys(dateMap).filter(d=>d.startsWith(String(year))).length}<span style={{fontSize:13}}>日</span></div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end",marginBottom:8}}>
            <span style={{fontSize:10,color:T.sub}}>少</span>
            {HEAT_COLORS.map(c=><div key={c} style={{width:CELL,height:CELL,borderRadius:3,background:c}}/>)}
            <span style={{fontSize:10,color:T.sub}}>多</span>
          </div>
          <div style={{overflowX:"auto",paddingBottom:4}}>
            <div style={{display:"flex",gap:0}}>
              <div style={{display:"flex",flexDirection:"column",gap:GAP,marginRight:4,paddingTop:18}}>
                {DAY_LABELS.map((d,i)=>(
                  <div key={i} style={{height:CELL,fontSize:9,color:`${T.sub}88`,display:"flex",alignItems:"center"}}>{i%2===0?d:""}</div>
                ))}
              </div>
              <div style={{display:"flex",gap:GAP}}>
                {weeks.map((week,wi)=>(
                  <div key={wi} style={{display:"flex",flexDirection:"column",gap:GAP}}>
                    <div style={{height:14,fontSize:9,color:T.sub,whiteSpace:"nowrap"}}>
                      {week[0].getDate()<=7&&week[0].getFullYear()===year?MONTH_LABELS[week[0].getMonth()]:""}
                    </div>
                    {week.map((day,di)=>{
                      const ds=fmt(day), sec=dateMap[ds]||0;
                      const isThisYear=day.getFullYear()===year;
                      const isToday=ds===todayStr();
                      return (
                        <div key={di}
                          onClick={()=>{ if(!isThisYear) return; setTooltip(tp=>tp?.date===ds?null:{date:ds,sec}); }}
                          style={{width:CELL,height:CELL,borderRadius:3,background:isThisYear?getColor(sec):"transparent",border:isToday?`1.5px solid ${T.accent}`:"1.5px solid transparent",cursor:isThisYear?"pointer":"default",flexShrink:0}}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {tooltip&&(
            <div style={{marginTop:8,background:T.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${T.accent}`}}>
              <div style={{fontSize:12,color:T.accent,fontWeight:700}}>{tooltip.date}</div>
              <div style={{fontSize:16,fontWeight:800,color:T.text}}>{tooltip.sec?fmtHMS(tooltip.sec):"記録なし"}</div>
              {getDiaryText(diaries[tooltip.date])?.trim()&&(
                <button onClick={()=>setDiaryModal(tooltip.date)} style={{marginTop:4,background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf24",borderRadius:6,padding:"3px 10px",color:"#fbbf24",fontSize:11,cursor:"pointer",fontWeight:700}}>📔 日記を見る</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      {/* スプラッシュ */}
      {splash&&(
        <div style={{position:"fixed",inset:0,zIndex:999,background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{marginBottom:24}}>
            <defs>
              <filter id="sp-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke={T.card} strokeWidth="6"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke={T.accent} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*0.25}
              transform="rotate(-90 50 50)" filter="url(#sp-glow)"
              style={{animation:"spin 1.4s linear infinite"}}/>
            <polyline points="30,52 44,66 70,38" fill="none" stroke={T.accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#sp-glow)"/>
            <style>{`@keyframes spin{from{stroke-dashoffset:${2*Math.PI*38}}to{stroke-dashoffset:${-2*Math.PI*38}}}`}</style>
          </svg>
          <div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.5px",marginBottom:6}}>TimeFlow</div>
          <div style={{fontSize:13,color:T.sub,letterSpacing:2}}>タスク & 時間管理</div>
        </div>
      )}

      <OfflineBanner/>

      {/* 自動停止バナー */}
      {autoStopInfo&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:600,background:"#fb923c",padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:"#fff"}}>⏱ タイマーが自動停止しました</div>
            <div style={{fontSize:BASE_FONT-3,color:"rgba(255,255,255,0.85)"}}>2時間を超えたため停止。時間を確認・調整してください。</div>
          </div>
          <button onClick={()=>{
            const cat = categories.find(c=>c.id===(autoStopInfo.savedState?.catId||selectedCat))||categories[0];
            setEditingLog({ id:Date.now(), date:autoStopInfo.savedState?.date||todayStr(), label:cat.name, catId:cat.id, duration:autoStopInfo.duration, mode:autoStopInfo.savedState?.mode||mode, startHour:autoStopInfo.savedState?.startHour||null, _isAutoStop:true });
            setAutoStopInfo(null); setTab("log");
          }} style={{background:"#fff",color:"#fb923c",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:800,cursor:"pointer",fontSize:BASE_FONT-2,flexShrink:0}}>
            時間を調整して記録
          </button>
          <button onClick={()=>setAutoStopInfo(null)} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"0 4px"}}>×</button>
        </div>
      )}

      {/* 計測中フルスクリーン */}
      {running&&tab!=="timer"&&(
        <div style={{position:"fixed",inset:0,zIndex:90,background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:11,color:T.sub,marginBottom:8,letterSpacing:2}}>計測中</div>
          <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={true} color={catColor} theme={T}/>
          <div style={{marginTop:8,fontSize:BASE_FONT-1,color:T.sub}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{marginTop:4,fontSize:BASE_FONT-1,color:T.sub}}>{fmtHMS(elapsed)}</div>
          <div style={{display:"flex",gap:12,marginTop:28}}>
            <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={timerPause}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={()=>{handleStop();setTab("timer");}}>■ 終了・記録</button>
          </div>
          <button style={{marginTop:20,background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:BASE_FONT,fontWeight:600}} onClick={()=>setTab("timer")}>タイマー画面へ →</button>
        </div>
      )}

      {/* ヘッダー */}
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px"}}>TimeFlow</div>
            <div style={{fontSize:10,color:T.sub}}>タスク & 時間管理 <span style={{color:`${T.sub}88`,marginLeft:4}}>v2.8.5</span></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!diaryModal && <button onClick={()=>setShowBackup(true)}  style={{background:"none",border:"none",color:`${T.sub}88`,fontSize:18,cursor:"pointer",padding:2}}>💾</button>}
            {!diaryModal && <button onClick={()=>setShowSettings(true)} style={{background:"none",border:"none",color:`${T.sub}88`,fontSize:18,cursor:"pointer",padding:2}}>⚙️</button>}
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:running?"#34d399":T.muted,boxShadow:running?"0 0 8px #34d399":"none"}}/>
              <span style={{fontSize:10,color:running?"#34d399":T.sub,fontFamily:"monospace"}}>{running?fmtTime(elapsed):"待機中"}</span>
            </div>
          </div>
        </div>
        <div style={S.tabs}>
          {[{id:"task",label:"タスク"},{id:"timer",label:"タイマー"},{id:"log",label:"記録"}].map(t=>(
            <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={S.body}>
        {tab==="task"  && <TaskTab/>}
        {tab==="timer" && <TimerTab/>}
        {tab==="log"   && <LogTab/>}
      </div>

      {/* モーダル */}
      {showSettings   && <SettingsScreen/>}
      {showMonthly    && <MonthlyTaskModal    tasks={monthlyTasks} onSave={t=>{setMonthlyTasks(t);setShowMonthly(false);}} onClose={()=>setShowMonthly(false)} theme={T}/>}
      {showGoogleCal  && <GoogleCalendarModal onImport={evts=>setCalendarEvents(p=>[...p,...evts])} onClose={()=>setShowGoogleCal(false)} theme={T}/>}
      {diaryModal     && <DiaryScreen/>}
      {showWeekHistory&& <WeekHistoryModal    history={weekHistory} onClose={()=>setShowWeekHistory(false)} theme={T}/>}
      {showLongTerm   && <LongTermModal       tasks={longTermTasks} onSave={setLongTermTasks} onClose={()=>setShowLongTerm(false)} theme={T}/>}
      {showWeeklyMgr  && <WeeklyTemplateManager templates={weeklyTemplates} onSave={saveWeeklyTemplates} onClose={()=>setShowWeeklyMgr(false)} theme={T}/>}
      {showCatMgr     && <CatManagerModal     categories={categories} onChange={c=>{setCategories(c);if(!c.find(x=>x.id===selectedCat))setSelectedCat(c[0]?.id);}} onClose={()=>setShowCatMgr(false)} theme={T}/>}
      {editingLog     && <EditLogModal log={editingLog} categories={categories} onSave={u=>{
        if(u._isAutoStop){ const {_isAutoStop,...clean}=u; setLogs(p=>[{...clean,id:Date.now()},...p]); }
        else { setLogs(p=>p.map(l=>l.id===u.id?u:l)); }
        setEditingLog(null);
      }} onClose={()=>setEditingLog(null)} theme={T}/>}
      {showDiaryList  && <DiaryListModal      diaries={diaries} onOpen={d=>{setShowDiaryList(false);setDiaryModal(d);}} onClose={()=>setShowDiaryList(false)} theme={T}/>}
      {showDiaryAnalysis && <DiaryAnalysisModal diaries={diaries} logs={logs} studyCatId={studyCatId} onClose={()=>setShowDiaryAnalysis(false)} theme={T}/>}
      {movePopup      && <MoveTaskPopup       task={movePopup.task} fromDay={movePopup.fromDay} onMove={moveTask} onClose={()=>setMovePopup(null)} theme={T}/>}
      {showBackup     && <BackupModal
        data={{categories,selectedCat,studyCatId,weeklyTemplates,weeklyTasks,customTasks,longTermTasks,logs,diaries,goalHours,weekHistory,exportedAt:new Date().toISOString(),appVersion:"v2.8.5"}}
        onRestore={p=>{
          if(p.categories)      setCategories(p.categories);
          if(p.selectedCat)     setSelectedCat(p.selectedCat);
          if(p.studyCatId)      setStudyCatId(p.studyCatId);
          if(p.weeklyTemplates) setWeeklyTemplates(p.weeklyTemplates);
          if(p.weeklyTasks)     setWeeklyTasks(p.weeklyTasks);
          if(p.customTasks)     setCustomTasks(p.customTasks);
          if(p.longTermTasks)   setLongTermTasks(p.longTermTasks);
          if(p.logs)            setLogs(p.logs);
          if(p.diaries)         setDiaries(p.diaries);
          if(p.goalHours)       setGoalHours(p.goalHours);
          if(p.weekHistory)     setWeekHistory(p.weekHistory);
        }}
        onClose={()=>setShowBackup(false)}
        theme={T}
      />}
    </div>
  );
}
