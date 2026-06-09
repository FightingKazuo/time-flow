import { useState, useEffect, useRef } from "react";
import { BASE_FONT, DAYS_LABEL, pad } from "../../constants";

const CLIENT_ID = "931629794947-m5gea5ci9u3oe9a2smqaqcsfot0qgo7e.apps.googleusercontent.com";
const SCOPE     = "https://www.googleapis.com/auth/calendar.readonly";

export default function GoogleCalendarModal({ onImport, onClose }) {
  const [status,   setStatus]   = useState("idle");
  const [events,   setEvents]   = useState([]);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(new Set());
  const tokenRef = useRef(null);

  // GIS tokenClient
  useEffect(() => {
    const loadGIS = () => {
      if(!window.google?.accounts?.oauth2) return;
      tokenRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (resp) => {
          if(resp.error) {
            setError("認証エラー: " + resp.error);
            setStatus("idle");
            return;
          }
          await fetchEvents(resp.access_token);
        },
      });
    };

    if(window.google?.accounts?.oauth2) {
      loadGIS();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = loadGIS;
      script.onerror = () => setError("Google APIの読み込みに失敗しました");
      document.body.appendChild(script);
    }
  }, []);

  const signIn = () => {
    if(!tokenRef.current) { setError("Google APIが読み込まれていません"); return; }
    setStatus("loading");
    setError("");
    tokenRef.current.requestAccessToken();
  };

  const fetchEvents = async (token) => {
    try {
      const now   = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 7);
      const end   = new Date(now); end.setDate(end.getDate() + 30);

      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("timeMin",      start.toISOString());
      url.searchParams.set("timeMax",      end.toISOString());
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy",      "startTime");
      url.searchParams.set("maxResults",   "50");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const items = (data.items || []).map(e => {
        const startStr = e.start.dateTime || e.start.date;
        const d = new Date(startStr);
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
      setSelected(new Set(items.map(e => e.id)));
      setStatus("authed");
    } catch(e) {
      setError("カレンダー取得エラー: " + e.message);
      setStatus("idle");
    }
  };

  const toggleSelect = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const doImport = () => {
    const toImport = events
      .filter(e => selected.has(e.id))
      .map(e => ({ ...e, id: `gc_${e.id}_${Date.now()}` }));
    onImport(toImport);
    onClose();
  };

  const fmt = dateStr => {
    const d = new Date(dateStr + "T00:00:00");
    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    return `${d.getMonth()+1}/${d.getDate()}（${DAYS_LABEL[dayIdx]}）`;
  };

  const bS = bg => ({
    background: bg, color: "#fff", border: "none", borderRadius: 10,
    padding: "13px 0", fontWeight: 700, cursor: "pointer",
    fontSize: BASE_FONT, width: "100%", marginBottom: 8,
  });

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:600}}
      onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📅 Googleカレンダー</div>
            <div style={{fontSize:11,color:"#6b7a99"}}>過去1週間〜30日後の予定を取得</div>
          </div>
          {status==="authed" && (
            <button onClick={()=>{setStatus("idle");setEvents([]);setSelected(new Set());}}
              style={{background:"none",border:"1px solid #3d4560",borderRadius:8,padding:"5px 10px",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3}}>
              リセット
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{background:"rgba(248,113,113,0.12)",border:"1px solid #f87171",borderRadius:8,padding:10,marginBottom:12,fontSize:BASE_FONT-2,color:"#f87171"}}>
            {error}
          </div>
        )}

        {/* idle */}
        {status === "idle" && (
          <div style={{textAlign:"center",padding:"20px 0",flex:1}}>
            <div style={{fontSize:48,marginBottom:12}}>📅</div>
            <div style={{fontSize:BASE_FONT-1,color:"#6b7a99",marginBottom:24,lineHeight:1.6}}>
              Googleアカウントでサインインして<br/>カレンダーの予定を取得します
            </div>
            <button style={bS("#4285f4")} onClick={signIn}>
              Googleでサインイン
            </button>
          </div>
        )}

        {/* loading */}
        {status === "loading" && (
          <div style={{textAlign:"center",padding:"40px 0",color:"#6b7a99",fontSize:BASE_FONT,flex:1}}>
            <div style={{fontSize:32,marginBottom:12}}>⏳</div>
            認証中・取得中...
          </div>
        )}

        {/* authed */}
        {status === "authed" && (
          <>
            <div style={{fontSize:BASE_FONT-2,color:"#6b7a99",marginBottom:8}}>
              {events.length}件の予定 · {selected.size}件選択中
            </div>
            <div style={{overflowY:"auto",flex:1,marginBottom:12}}>
              {events.length === 0 && (
                <div style={{textAlign:"center",color:"#6b7a99",padding:20}}>
                  この期間に予定が見つかりません
                </div>
              )}
              {events.map(e => (
                <div key={e.id} onClick={() => toggleSelect(e.id)}
                  style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid #2a2f3d",cursor:"pointer"}}>
                  <div style={{
                    width:18,height:18,borderRadius:5,flexShrink:0,marginTop:2,
                    border:`2px solid ${selected.has(e.id)?"#4285f4":"#3d4560"}`,
                    background:selected.has(e.id)?"#4285f4":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    {selected.has(e.id) && <span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT-1,fontWeight:600}}>{e.title}</div>
                    <div style={{fontSize:11,color:"#4f9eff",marginTop:2}}>
                      {fmt(e.date)}{e.time && <span style={{marginLeft:6}}>⏰{e.time}</span>}
                    </div>
                    {e.note && (
                      <div style={{fontSize:10,color:"#6b7a99",marginTop:2}}>{e.note.slice(0,60)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button style={bS("#34d399")} onClick={doImport} disabled={selected.size===0}>
              {selected.size}件をTimeFlowに追加
            </button>
          </>
        )}

        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:4}}>
          閉じる
        </button>
      </div>
    </div>
  );
}
