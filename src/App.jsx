import { useState, useEffect, useRef, useCallback } from "react";
import {
  DEFAULT_CATS, DAYS_LABEL, WEEKLY_DEFAULTS, BASE_FONT,
  pad, fmtTime, fmtHMS, fmtHM, fmtDate, todayStr, hexRgb,
  getWeekMonday, getDayDate, dayDateStr, todayDayIdx,
  buildWeeklyTasks, LS, notify,
} from "./constants";
import RingTimer          from "./components/RingTimer";
import TimelineBar        from "./components/TimelineBar";
import CategoryDial       from "./components/CategoryDial";
import TaskInput          from "./components/TaskInput";
import WeeklyProgress     from "./components/WeeklyProgress";
import DiaryModal         from "./components/modals/DiaryModal";
import DiaryListModal     from "./components/modals/DiaryListModal";
import EditLogModal       from "./components/modals/EditLogModal";
import CatManagerModal    from "./components/modals/CatManagerModal";
import BackupModal        from "./components/modals/BackupModal";
import WeekHistoryModal   from "./components/modals/WeekHistoryModal";
import LongTermModal      from "./components/modals/LongTermModal";
import WeeklyTemplateManager from "./components/modals/WeeklyTemplateManager";
import MoveTaskPopup      from "./components/modals/MoveTaskPopup";
import { useTimer }       from "./hooks/useTimer";
import { useWeekReset }   from "./hooks/useWeekReset";

export default function App() {
  const [tab,          setTab]          = useState("task");
  const [categories,   setCategories]   = useState(()=>LS.get("tf_categories",   DEFAULT_CATS));
  const [selectedCat,  setSelectedCat]  = useState(()=>LS.get("tf_selectedCat",  DEFAULT_CATS[0].id));
  const [studyCatId,   setStudyCatId]   = useState(()=>LS.get("tf_studyCatId",   "study"));
  const [showCatMgr,   setShowCatMgr]   = useState(false);
  const [showBackup,   setShowBackup]   = useState(false);
  const [showWeeklyMgr,setShowWeeklyMgr]= useState(false);
  const [weeklyTemplates,setWeeklyTemplates]=useState(()=>LS.get("tf_weeklyTpls", WEEKLY_DEFAULTS));
  const [longTermTasks, setLongTermTasks] = useState(()=>LS.get("tf_longTerm", []));
  const [showLongTerm,  setShowLongTerm]  = useState(false);
  const [splash,        setSplash]        = useState(true);
  const [weekHistory,   setWeekHistory]   = useState(()=>LS.get("tf_weekHistory", []));
  const [showWeekHistory, setShowWeekHistory] = useState(false);
  const [weeklyTasks,  setWeeklyTasks]  = useState(()=>LS.get("tf_weeklyTasks",  buildWeeklyTasks(WEEKLY_DEFAULTS)));
  const [customTasks,  setCustomTasks]  = useState(()=>LS.get("tf_customTasks",  Object.fromEntries(DAYS_LABEL.map((_,i)=>[i,[]]))));
  const [addingDay,    setAddingDay]    = useState(null);
  const [movePopup,    setMovePopup]    = useState(null);
  const [mode,         setMode]         = useState("timer");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [logs,         setLogs]         = useState(()=>LS.get("tf_logs",         []));
  const [editingLog,   setEditingLog]   = useState(null);
  const [diaries,      setDiaries]      = useState(()=>LS.get("tf_diaries",      {}));
  const [diaryModal,   setDiaryModal]   = useState(null);
  const [showDiaryList,setShowDiaryList]= useState(false);
  const [goalHours,    setGoalHours]    = useState(()=>LS.get("tf_goalHours",    10));
  const [logSelectedDay, setLogSelectedDay] = useState(todayDayIdx());



  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { elapsed, running, start: timerStart, pause: timerPause, stop: timerStop } = useTimer({
    categories, selectedCat, mode, pomoDuration,
  });
  const pomoDone = mode==="pomodoro" && elapsed>=pomoDuration*60;

  useWeekReset({ setWeeklyTasks, setCustomTasks, setLongTermTasks, setWeekHistory, weeklyTemplates, longTermTasks });


  // Persist
  useEffect(()=>LS.set("tf_categories",  categories),  [categories]);
  useEffect(()=>LS.set("tf_selectedCat", selectedCat), [selectedCat]);
  useEffect(()=>LS.set("tf_weeklyTasks", weeklyTasks), [weeklyTasks]);
  useEffect(()=>LS.set("tf_customTasks", customTasks), [customTasks]);
  useEffect(()=>LS.set("tf_logs",        logs),        [logs]);
  useEffect(()=>LS.set("tf_diaries",     diaries),     [diaries]);
  useEffect(()=>LS.set("tf_longTerm",    longTermTasks), [longTermTasks]);
  useEffect(()=>LS.set("tf_studyCatId",  studyCatId),  [studyCatId]);
  useEffect(()=>LS.set("tf_weekHistory", weekHistory),  [weekHistory]);


  useEffect(()=>{
    if("Notification" in window&&Notification.permission==="default") Notification.requestPermission();
  },[]);



  const handleStop=()=>{ timerStop(log=>setLogs(p=>[log,...p])); };

  const catColor=categories.find(c=>c.id===selectedCat)?.color||"#4f9eff";
  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);

  const toggleTask=(dayIdx,id,weekly)=>{
    if(weekly) {
      setWeeklyTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
    } else {
      setCustomTasks(p=>{
        const next = {...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)};
        // Sync to long-term if linked
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
  const moveTask=toDay=>{
    if(!movePopup) return;
    const {task,fromDay}=movePopup;
    if(task.weekly) setWeeklyTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    else            setCustomTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    setCustomTasks(p=>({...p,[toDay]:[...p[toDay],{...task,id:Date.now(),weekly:false}]}));
    setMovePopup(null);
  };
  const saveDiary=(date,text)=>setDiaries(p=>({...p,[date]:text}));
  const reorderCategories=(newOrder)=>setCategories(newOrder);

  const S={
    app:{minHeight:"100vh",background:"#0d0f14",color:"#e8ecf4",fontFamily:"'Noto Sans JP',sans-serif",fontSize:BASE_FONT,display:"flex",flexDirection:"column"},
    header:{padding:"14px 16px 0",borderBottom:"1px solid #2a2f3d"},
    tabs:{display:"flex",gap:2,marginTop:10},
    tab:a=>({flex:1,padding:"10px 0",fontSize:BASE_FONT-1,fontWeight:700,border:"none",borderBottom:a?`2px solid ${catColor}`:"2px solid transparent",background:"transparent",color:a?catColor:"#3d4560",cursor:"pointer",transition:"all 0.2s"}),
    body:{flex:1,padding:"12px 12px",overflowY:"auto"},
    card:{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:12,marginBottom:10},
    input:{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",flex:1},
    btn:(bg="#4f9eff")=>({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:BASE_FONT-1,fontWeight:700,cursor:"pointer"}),
    btnSm:(a,c)=>({padding:"5px 10px",fontSize:BASE_FONT-2,fontWeight:700,border:`1px solid ${a?c:"#2a2f3d"}`,borderRadius:20,background:a?`rgba(${hexRgb(c)},0.2)`:"transparent",color:a?c:"#6b7a99",cursor:"pointer"}),
  };

  // ── Task Tab ──────────────────────────────────────────────────────────────
  const TaskTab=()=>{
    const mobile=window.innerWidth<640;
    return (
      <div>
        {/* Timeline bar */}
        <div style={{...S.card,background:"#161920",borderColor:"rgba(79,158,255,0.2)"}}>
          <TimelineBar logs={logs} categories={categories} date={todayStr()}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
            <div>
              <div style={{fontSize:10,color:"#6b7a99"}}>今日の合計</div>
              <div style={{fontSize:20,fontWeight:800,color:catColor,fontFamily:"monospace"}}>{fmtTime(todayTotal)}</div>
              <div style={{fontSize:10,color:"#6b7a99"}}>{fmtHMS(todayTotal)}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",cursor:"pointer",color:"#6b7a99",fontSize:BASE_FONT-1,fontWeight:600}}>📔 一覧</button>
              <button onClick={()=>setDiaryModal(todayStr())} style={{background:diaries[todayStr()]?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${diaries[todayStr()]?"#fbbf24":"#2a2f3d"}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",color:diaries[todayStr()]?"#fbbf24":"#6b7a99",fontSize:BASE_FONT-1,fontWeight:600}}>
                {diaries[todayStr()]?"📔 今日":"✏️ 日記"}
              </button>
            </div>
          </div>
        </div>

        <div style={{fontSize:BASE_FONT,fontWeight:800,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📋 今週のタスク</span>
          <button onClick={()=>setShowWeekHistory(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2f3d",borderRadius:8,padding:"5px 10px",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700}}>
            📅 週間履歴
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((day,i)=>{
            const wt=weeklyTasks[i]||[], ct=customTasks[i]||[], all=[...wt,...ct];
            const done=all.filter(t=>t.done).length, isToday=i===todayDayIdx();
            const dayDate=fmtDate(getDayDate(i)), hasDiary=diaries[dayDate]?.trim();
            return (
              <div key={i} style={{...S.card,padding:10,borderColor:isToday?catColor:"#2a2f3d",background:isToday?`rgba(${hexRgb(catColor)},0.06)`:"#1e2330"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:BASE_FONT-1,fontWeight:800,color:isToday?catColor:"#94a3b8"}}>{day}</span>
                    <span style={{fontSize:10,color:"#3d4560"}}>{dayDateStr(i)}</span>
                    {/* diary button */}
                    <button onClick={()=>setDiaryModal(dayDate)} style={{
                      background:hasDiary?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.06)",
                      border:`1.5px solid ${hasDiary?"#fbbf24":"#3d4560"}`,
                      borderRadius:8, padding:"3px 8px", cursor:"pointer",
                      fontSize:11, fontWeight:800,
                      color:hasDiary?"#fbbf24":"#6b7a99",
                      lineHeight:"18px", letterSpacing:0.3,
                      boxShadow:hasDiary?"0 0 6px rgba(251,191,36,0.3)":"none",
                    }}>
                      {hasDiary?"📔":"＋日記"}
                    </button>
                  </div>
                  {all.length>0&&<span style={{fontSize:9,fontWeight:700,color:done===all.length?"#34d399":"#6b7a99"}}>{done}/{all.length}</span>}
                </div>
                {all.length===0&&<div style={{fontSize:10,color:"#3d4560",textAlign:"center",padding:"4px 0"}}>—</div>}
                {all.map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 0",borderBottom:"1px solid #2a2f3d",opacity:t.done?0.4:1}}>
                    <button onClick={()=>setMovePopup({task:t,fromDay:i})} style={{background:"none",border:"none",color:"#3d4560",fontSize:14,flexShrink:0,cursor:"pointer",padding:"1px 2px",lineHeight:1}} title="移動">⇄</button>
                    <div onClick={()=>toggleTask(i,t.id,t.weekly)} style={{width:14,height:14,borderRadius:4,flexShrink:0,border:`2px solid ${t.done?"#34d399":"#3d4560"}`,background:t.done?"#34d399":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                    </div>
                    <span style={{fontSize:BASE_FONT-1,flex:1,lineHeight:1.3}}>{t.label}</span>
                    {t.weekly&&<span style={{fontSize:9,background:"rgba(79,158,255,0.12)",color:"#4f9eff",borderRadius:4,padding:"1px 4px",flexShrink:0}}>毎週</span>}
                    {t.fromLongTerm&&<span style={{fontSize:9,background:"rgba(251,146,60,0.12)",color:"#fb923c",borderRadius:4,padding:"1px 4px",flexShrink:0}}>📌</span>}
                  </div>
                ))}
                {addingDay===i
                  ?<TaskInput onAdd={label=>{ setCustomTasks(p=>({...p,[i]:[...p[i],{id:Date.now(),label,done:false}]})); setAddingDay(null); }} onCancel={()=>setAddingDay(null)} inputStyle={{...S.input,fontSize:BASE_FONT-1,padding:"5px 8px"}} btnStyle={S.btn}/>
                  :<button onClick={()=>setAddingDay(i)} style={{width:"100%",background:"none",border:"1px dashed #2a2f3d",borderRadius:6,padding:"5px 0",color:"#3d4560",cursor:"pointer",fontSize:16,marginTop:6}}>+</button>
                }
              </div>
            );
          })}
        </div>
        {/* 毎週タスク編集ボタン */}
        <button onClick={()=>setShowWeeklyMgr(true)} style={{width:"100%",background:"rgba(79,158,255,0.06)",border:"1px solid rgba(79,158,255,0.2)",borderRadius:10,padding:"12px 0",color:"#4f9eff",cursor:"pointer",fontSize:BASE_FONT-1,fontWeight:700,marginTop:4}}>
          ⚙ 毎週タスクを編集
        </button>

        {/* ── 長期タスク ── */}
        <div style={{marginTop:16,borderTop:"1px dashed #2a2f3d",paddingTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:BASE_FONT,fontWeight:800}}>📌 長期タスク</div>
              <div style={{fontSize:11,color:"#6b7a99"}}>週をまたいで管理</div>
            </div>
            <button onClick={()=>setShowLongTerm(true)} style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.3)",borderRadius:8,padding:"7px 14px",color:"#fb923c",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700}}>
              編集 / 追加
            </button>
          </div>
          {/* Active long-term tasks preview */}
          {longTermTasks.filter(t=>!t.done).length===0
            ?<div style={{textAlign:"center",color:"#3d4560",fontSize:BASE_FONT-2,padding:"10px 0"}}>タスクなし　→「編集 / 追加」から追加できます</div>
            :longTermTasks.filter(t=>!t.done).map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#1e2330",borderRadius:8,marginBottom:6,border:"1px solid #2a2f3d"}}>
                <div onClick={()=>setLongTermTasks(p=>p.map(x=>x.id===t.id?{...x,done:true,doneAt:todayStr()}:x))} style={{width:18,height:18,borderRadius:4,flexShrink:0,border:"2px solid #fb923c",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                </div>
                <span style={{fontSize:BASE_FONT-1,flex:1}}>{t.label}</span>
                <span style={{fontSize:10,color:"#3d4560"}}>{t.createdAt}</span>
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
  const TimerTab=()=>(
    <div style={running?{position:"fixed",inset:0,zIndex:88,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}:{maxWidth:400,margin:"0 auto"}}>
      {!running&&(
        <>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
            {["timer","pomodoro"].map(m=><button key={m} style={S.btnSm(mode===m,catColor)} onClick={()=>{setMode(m);}}>{m==="timer"?"⏱ タイマー":"🍅 ポモドーロ"}</button>)}
          </div>
          <CategoryDial categories={categories} selected={selectedCat} onSelect={setSelectedCat} disabled={false}/>
          <div style={{textAlign:"center",marginBottom:10}}>
            <button style={{background:"none",border:"none",color:"#3d4560",fontSize:BASE_FONT-2,cursor:"pointer"}} onClick={()=>setShowCatMgr(true)}>⚙ カテゴリーを管理</button>
          </div>
          {mode==="pomodoro"&&(
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[15,25,45,60].map(m=><button key={m} style={S.btnSm(pomoDuration===m,"#fb923c")} onClick={()=>setPomoDuration(m)}>{m}分</button>)}
            </div>
          )}
        </>
      )}
      {running&&<div style={{fontSize:11,color:"#6b7a99",marginBottom:6,letterSpacing:2,textTransform:"uppercase"}}>計測中</div>}
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={running} color={catColor}/>
      </div>
      {pomoDone&&<div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:10,padding:10,textAlign:"center",marginBottom:12,fontSize:BASE_FONT,color:"#34d399",fontWeight:700}}>🎉 {pomoDuration}分完了！計測は継続中</div>}
      {running&&(
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT-1,color:"#6b7a99"}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{fontSize:BASE_FONT-1,color:"#6b7a99",marginTop:4}}>{fmtHMS(elapsed)}</div>
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
      {!running&&elapsed>0&&<div style={{textAlign:"center",marginTop:12,color:"#6b7a99",fontSize:BASE_FONT-1}}>経過: <span style={{color:"#e8ecf4",fontWeight:700,fontFamily:"monospace"}}>{fmtTime(elapsed)}</span> ({fmtHMS(elapsed)})</div>}
    </div>
  );

  // ── Log Tab ───────────────────────────────────────────────────────────────
  const LogTab=()=>{
    const [editGoal,setEditGoal]=useState(false);
    const [gInput,setGInput]=useState(String(goalHours));
    const byDate={};
    logs.forEach(l=>{ if(!byDate[l.date]) byDate[l.date]=[]; byDate[l.date].push(l); });
    const dates=Object.keys(byDate).sort().reverse();
    return (
      <div>
        <WeeklyProgress weeklyTasks={weeklyTasks} customTasks={customTasks} logs={logs} diaries={diaries} goalHours={goalHours} onSelectDay={setLogSelectedDay} selectedDay={logSelectedDay} studyCatId={studyCatId}/>
        {/* Study cat + goal settings */}
        <div style={{...S.card,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:BASE_FONT-2,color:"#6b7a99"}}>目標対象カテゴリー</span>
            <select value={studyCatId} onChange={e=>setStudyCatId(e.target.value)} style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"5px 10px",color:"#e8ecf4",fontSize:BASE_FONT-2,outline:"none"}}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:BASE_FONT-2,color:"#6b7a99"}}>週間目標時間</span>
            {editGoal
              ?<div style={{display:"flex",gap:6,alignItems:"center"}}><input style={{...S.input,width:54,textAlign:"center"}} type="number" min="1" value={gInput} onChange={e=>setGInput(e.target.value)}/><span style={{color:"#6b7a99",fontSize:BASE_FONT-2}}>時間</span><button style={S.btn()} onClick={()=>{setGoalHours(Math.max(1,Number(gInput)));setEditGoal(false);}}>✓</button></div>
              :<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:"#34d399"}}>{goalHours}h</span><button style={{...S.btn("#2a2f3d"),padding:"5px 10px",fontSize:BASE_FONT-2}} onClick={()=>setEditGoal(true)}>変更</button></div>
            }
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:BASE_FONT+1,fontWeight:800}}>📊 記録</span>
          <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(251,191,36,0.1)",border:"1px solid #fbbf2440",borderRadius:8,padding:"5px 10px",color:"#fbbf24",fontSize:BASE_FONT-2,cursor:"pointer",fontWeight:600}}>📔 日記一覧</button>
        </div>
        {logs.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:40,fontSize:BASE_FONT}}>記録がありません。<br/>タイマーで計測を始めましょう！</div>}
        {dates.map(date=>{
          const dl=byDate[date], total=dl.reduce((s,l)=>s+l.duration,0);
          const byCat={}; dl.forEach(l=>{ byCat[l.catId]=(byCat[l.catId]||0)+l.duration; });
          return (
            <div key={date} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:BASE_FONT,fontWeight:800,color:catColor}}>{date}</span>
                  {diaries[date]?.trim()&&<button onClick={()=>setDiaryModal(date)} style={{background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf24",borderRadius:6,padding:"2px 7px",color:"#fbbf24",fontSize:10,cursor:"pointer",fontWeight:700}}>📔</button>}
                </div>
                <span style={{fontSize:BASE_FONT-1,color:"#34d399",fontWeight:700}}>{fmtHMS(total)}</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"#1e2330",display:"flex",overflow:"hidden",marginBottom:8}}>
                {Object.entries(byCat).map(([cid,dur])=>{ const cat=categories.find(c=>c.id===cid); return <div key={cid} style={{width:`${(dur/86400)*100}%`,background:cat?.color||"#6b7a99",minWidth:dur>60?2:0}}/>; })}
              </div>
              {dl.map(l=>{ const cat=categories.find(c=>c.id===l.catId); return (
                <div key={l.id} style={{...S.card,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:cat?.color||"#6b7a99",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT,fontWeight:700}}>{l.label}</div>
                    <div style={{fontSize:10,color:"#6b7a99",marginTop:1}}>{l.mode==="pomodoro"?"🍅":"⏱"}{cat&&<span style={{marginLeft:4,color:cat.color}}>#{cat.name}</span>}{l.startHour!=null&&<span style={{marginLeft:6,color:"#3d4560"}}>{Math.floor(l.startHour)}:{pad(Math.round((l.startHour%1)*60))}〜</span>}</div>
                  </div>
                  <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:"#e8ecf4",textAlign:"right"}}>
                    <div style={{fontFamily:"monospace"}}>{fmtTime(l.duration)}</div>
                    <div style={{fontSize:10,color:"#6b7a99"}}>{fmtHMS(l.duration)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    <button style={{background:"#2a2f3d",border:"none",borderRadius:5,padding:"3px 8px",color:"#94a3b8",cursor:"pointer",fontSize:10}} onClick={()=>setEditingLog(l)}>編集</button>
                    <button style={{background:"#2a2f3d",border:"none",borderRadius:5,padding:"3px 8px",color:"#f87171",cursor:"pointer",fontSize:10}} onClick={()=>setLogs(p=>p.filter(x=>x.id!==l.id))}>削除</button>
                  </div>
                </div>
              );})}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={S.app}>
      {/* ── Splash Screen ── */}
      {splash&&(
        <div style={{position:"fixed",inset:0,zIndex:999,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.5s",opacity:1}}>
          {/* Animated ring */}
          <svg width="100" height="100" viewBox="0 0 100 100" style={{marginBottom:24}}>
            <defs>
              <filter id="sp-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#1e2330" strokeWidth="6"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#4f9eff" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*0.25}
              transform="rotate(-90 50 50)" filter="url(#sp-glow)"
              style={{animation:"spin 1.4s linear infinite"}}/>
            {/* Check icon */}
            <polyline points="30,52 44,66 70,38" fill="none" stroke="#4f9eff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#sp-glow)"/>
            <style>{`@keyframes spin{from{stroke-dashoffset:${2*Math.PI*38}}to{stroke-dashoffset:${-2*Math.PI*38}}}`}</style>
          </svg>
          <div style={{fontSize:28,fontWeight:900,color:"#e8ecf4",letterSpacing:"-0.5px",marginBottom:6}}>TimeFlow</div>
          <div style={{fontSize:13,color:"#6b7a99",letterSpacing:2}}>タスク & 時間管理</div>
        </div>
      )}
      {/* Full-screen timer when running and not on timer tab */}
      {running&&tab!=="timer"&&(
        <div style={{position:"fixed",inset:0,zIndex:90,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:11,color:"#6b7a99",marginBottom:8,letterSpacing:2}}>計測中</div>
          <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={true} color={catColor}/>
          <div style={{marginTop:8,fontSize:BASE_FONT-1,color:"#6b7a99"}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{marginTop:4,fontSize:BASE_FONT-1,color:"#6b7a99"}}>{fmtHMS(elapsed)}</div>
          <div style={{display:"flex",gap:12,marginTop:28}}>
            <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={timerPause}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={()=>{handleStop();setTab("timer");}}>■ 終了・記録</button>
          </div>
          <button style={{marginTop:20,background:"none",border:"none",color:"#4f9eff",cursor:"pointer",fontSize:BASE_FONT,fontWeight:600}} onClick={()=>setTab("timer")}>タイマー画面へ →</button>
        </div>
      )}

      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px"}}>TimeFlow</div><div style={{fontSize:10,color:"#6b7a99"}}>タスク & 時間管理</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShowBackup(true)} style={{background:"none",border:"none",color:"#3d4560",fontSize:18,cursor:"pointer",padding:2}}>💾</button>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:running?"#34d399":"#3d4560",boxShadow:running?"0 0 8px #34d399":"none"}}/>
              <span style={{fontSize:10,color:running?"#34d399":"#3d4560",fontFamily:"monospace"}}>{running?fmtTime(elapsed):"待機中"}</span>
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
        {tab==="task"&&<TaskTab/>}
        {tab==="timer"&&<TimerTab/>}
        {tab==="log"&&<LogTab/>}
      </div>

      {showWeekHistory&&<WeekHistoryModal history={weekHistory} onClose={()=>setShowWeekHistory(false)}/>}
      {showLongTerm&&<LongTermModal tasks={longTermTasks} onSave={setLongTermTasks} onClose={()=>setShowLongTerm(false)}/>}
      {showWeeklyMgr&&<WeeklyTemplateManager templates={weeklyTemplates} onSave={saveWeeklyTemplates} onClose={()=>setShowWeeklyMgr(false)}/>}
      {showCatMgr&&<CatManagerModal categories={categories} onChange={c=>{setCategories(c);if(!c.find(x=>x.id===selectedCat))setSelectedCat(c[0]?.id);}} onClose={()=>setShowCatMgr(false)}/>}
      {editingLog&&<EditLogModal log={editingLog} categories={categories} onSave={u=>{setLogs(p=>p.map(l=>l.id===u.id?u:l));setEditingLog(null);}} onClose={()=>setEditingLog(null)}/>}
      {diaryModal&&<DiaryModal date={diaryModal} diary={diaries[diaryModal]} onSave={t=>saveDiary(diaryModal,t)} onClose={()=>setDiaryModal(null)}/>}
      {showDiaryList&&<DiaryListModal diaries={diaries} onOpen={d=>{setShowDiaryList(false);setDiaryModal(d);}} onClose={()=>setShowDiaryList(false)}/>}
      {movePopup&&<MoveTaskPopup task={movePopup.task} fromDay={movePopup.fromDay} onMove={moveTask} onClose={()=>setMovePopup(null)}/>}
      {showBackup&&<BackupModal
        data={{
          categories, selectedCat, studyCatId,
          weeklyTemplates, weeklyTasks, customTasks,
          longTermTasks, logs, diaries,
          goalHours, weekHistory,
          exportedAt: new Date().toISOString(),
          appVersion: "v16",
        }}
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
      />}
    </div>
  );
}
