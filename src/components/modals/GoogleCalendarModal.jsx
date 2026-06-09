import { useState, useEffect } from "react";
import { BASE_FONT, fmtDate, DAYS_LABEL, pad } from "../../constants";

const CLIENT_ID = "931629794947-m5gea5ci9u3oe9a2smqaqcsfot0qgo7e.apps.googleusercontent.com";
const SCOPES    = "https://www.googleapis.com/auth/calendar.readonly";
const DISCOVERY = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

export default function GoogleCalendarModal({ onImport, onClose }) {
  const [status,   setStatus]   = useState("idle"); // idle | loading | authed | error
  const [events,   setEvents]   = useState([]);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(new Set());
  const [gapiReady,setGapiReady]= useState(false);

  // Load GAPI
  useEffect(() => {
    if(window.gapi) { setGapiReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client:auth2", async () => {
        try {
          await window.gapi.client.init({
            clientId: CLIENT_ID,
            discoveryDocs: [DISCOVERY],
            scope: SCOPES,
          });
          setGapiReady(true);
          // すでにサインイン済みなら取得
          if(window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
            await fetchEvents();
          }
        } catch(e) {
          setError("Google API初期化エラー: " + e.message);
          setStatus("error");
        }
      });
    };
    script.onerror = () => { setError("Google APIの読み込みに失敗しました"); setStatus("error"); };
    document.body.appendChild(script);
  }, []);

  const signIn = async () => {
    if(!gapiReady) return;
    setStatus("loading");
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
      await fetchEvents();
    } catch(e) {
      setError("サインインをキャンセルしました");
      setStatus("idle");
    }
  };

  const fetchEvents = async () => {
    setStatus("loading");
    try {
      const now   = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 7);  // 1週間前
      const end   = new Date(now); end.setDate(end.getDate() + 30);     // 30日後

      const res = await window.gapi.client.calendar.events.list({
        calendarId:   "primary",
        timeMin:       start.toISOString(),
        timeMax:       end.toISOString(),
        singleEvents:  true,
        orderBy:       "startTime",
        maxResults:    50,
      });

      const items = (res.result.items || []).map(e => {
        const start = e.start.dateTime || e.start.date;
        const d = new Date(start);
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const timeStr = e.start.dateTime
          ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
          : null;
        return {
          id:    e.id,
          title: e.summary || "（タイトルなし）",
          date:  dateStr,
          time:  timeStr,
          note:  e.description || null,
        };
      });

      setEvents(items);
      setSelected(new Set(items.map(e=>e.id)));
      setStatus("authed");
    } catch(e) {
      setError("カレンダーの取得に失敗: " + (e.message || JSON.stringify(e)));
      setStatus("error");
    }
  };

  const signOut = async () => {
    await window.gapi.auth2.getAuthInstance().signOut();
    setEvents([]); setSelected(new Set()); setStatus("idle");
  };

  const toggleSelect = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const doImport = () => {
    const toImport = events.filter(e=>selected.has(e.id)).map(e=>({
      ...e, id: `gc_${e.id}_${Date.now()}`
    }));
    onImport(toImport);
    onClose();
  };

  const fmt = d => {
    const dt = new Date(d+"T00:00:00");
    const day = dt.getDay()===0?6:dt.getDay()-1;
    return `${dt.getMonth()+1}/${dt.getDate()}（${DAYS_LABEL[day]}）`;
  };

  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT,width:"100%",marginBottom:8});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:600}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📅 Googleカレンダー</div>
            <div style={{fontSize:11,color:"#6b7a99"}}>過去1週間〜30日後の予定を取得</div>
          </div>
          {status==="authed"&&<button onClick={signOut} style={{background:"none",border:"1px solid #3d4560",borderRadius:8,padding:"5px 10px",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3}}>ログアウト</button>}
        </div>

        {/* Error */}
        {error&&<div style={{background:"rgba(248,113,113,0.12)",border:"1px solid #f87171",borderRadius:8,padding:10,marginBottom:12,fontSize:BASE_FONT-2,color:"#f87171"}}>{error}</div>}

        {/* States */}
        {status==="idle"&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>📅</div>
            <div style={{fontSize:BASE_FONT,color:"#6b7a99",marginBottom:20}}>Googleアカウントでサインインして<br/>カレンダーの予定を取得します</div>
            <button style={bS("#4285f4")} onClick={signIn} disabled={!gapiReady}>
              {gapiReady?"Googleでサインイン":"読み込み中..."}
            </button>
          </div>
        )}

        {status==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 0",color:"#6b7a99",fontSize:BASE_FONT}}>
            <div style={{fontSize:32,marginBottom:12}}>⏳</div>
            取得中...
          </div>
        )}

        {status==="authed"&&(
          <>
            <div style={{fontSize:BASE_FONT-2,color:"#6b7a99",marginBottom:8}}>
              {events.length}件の予定 · {selected.size}件選択中
            </div>
            <div style={{overflowY:"auto",flex:1,marginBottom:12}}>
              {events.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:20}}>予定が見つかりません</div>}
              {events.map(e=>(
                <div key={e.id} onClick={()=>toggleSelect(e.id)}
                  style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid #2a2f3d",cursor:"pointer"}}>
                  <div style={{width:18,height:18,borderRadius:5,flexShrink:0,marginTop:2,
                    border:`2px solid ${selected.has(e.id)?"#4285f4":"#3d4560"}`,
                    background:selected.has(e.id)?"#4285f4":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {selected.has(e.id)&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT-1,fontWeight:600}}>{e.title}</div>
                    <div style={{fontSize:11,color:"#4f9eff",marginTop:2}}>
                      {fmt(e.date)}{e.time&&<span style={{marginLeft:6}}>⏰{e.time}</span>}
                    </div>
                    {e.note&&<div style={{fontSize:10,color:"#6b7a99",marginTop:2}}>{e.note.slice(0,50)}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button style={bS("#34d399")} onClick={doImport} disabled={selected.size===0}>
              {selected.size}件をTimeFlowに追加
            </button>
          </>
        )}

        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:4}}>閉じる</button>
      </div>
    </div>
  );
}
