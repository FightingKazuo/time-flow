import { useState, useEffect, useRef } from "react";
import { BASE_FONT, LS } from "../../constants";

const CLIENT_ID   = "931629794947-m5gea5ci9u3oe9a2smqaqcsfot0qgo7e.apps.googleusercontent.com";
const SCOPE       = "https://www.googleapis.com/auth/drive.appdata";
const TOKEN_KEY   = "tf_drive_token";
const EXPIRY_KEY  = "tf_drive_expiry";
const FILE_NAME   = "timeflow-data.json";

// アクセストークン取得
const getToken = () => {
  const token  = LS.get(TOKEN_KEY, null);
  const expiry = LS.get(EXPIRY_KEY, 0);
  if(token && Date.now() < expiry) return token;
  return null;
};

// Drive appdata内のファイルを検索
const findFile = async (token) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.files?.[0] || null;
};

// ファイル内容を取得
const downloadFile = async (token, fileId) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
};

// ファイルを作成 or 更新（iOS対応: multipartを使わずシンプルな方法で）
const uploadFile = async (token, fileId, data) => {
  const body = JSON.stringify(data);

  if(fileId) {
    // 既存ファイル更新
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
      }
    );
    return res.json();
  } else {
    // 新規: まずメタデータでファイル作成
    const metaRes = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" }),
      }
    );
    const metaData = await metaRes.json();
    if(!metaData.id) throw new Error("ファイル作成失敗: " + JSON.stringify(metaData));

    // 次にコンテンツをアップロード
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${metaData.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
      }
    );
    return res.json();
  }
};

export default function GoogleDriveSync({ appData, onRestore, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";
  const accent = t.accent || "#4f8ef7";

  const [status,    setStatus]    = useState("idle"); // idle | loading | authed | error
  const [msg,       setMsg]       = useState(null);   // {ok, text}
  const [driveFile, setDriveFile] = useState(null);   // {id, modifiedTime}
  const tokenRef = useRef(null);

  const isAuthed = !!getToken();

  useEffect(() => {
    if(isAuthed) checkDriveFile();
  }, []);

  useEffect(() => {
    const load = () => {
      if(!window.google?.accounts?.oauth2) return;
      tokenRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (resp) => {
          if(resp.error) { setMsg({ok:false, text:"認証エラー: "+resp.error}); setStatus("idle"); return; }
          LS.set(TOKEN_KEY,  resp.access_token);
          LS.set(EXPIRY_KEY, Date.now() + 3500 * 1000);
          setStatus("authed");
          await checkDriveFile();
        },
      });
    };
    if(window.google?.accounts?.oauth2) { load(); }
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = load;
      document.body.appendChild(s);
    }
  }, []);

  const checkDriveFile = async () => {
    const token = getToken();
    if(!token) return;
    try {
      const file = await findFile(token);
      setDriveFile(file);
      setStatus("authed");
    } catch(e) {
      setMsg({ok:false, text:"Drive確認エラー: "+e.message});
    }
  };

  const signIn = () => {
    if(!tokenRef.current) { setMsg({ok:false, text:"Google APIが読み込まれていません"}); return; }
    setStatus("loading");
    tokenRef.current.requestAccessToken();
  };

  const signOut = () => {
    LS.set(TOKEN_KEY, null);
    LS.set(EXPIRY_KEY, 0);
    setStatus("idle");
    setDriveFile(null);
    setMsg(null);
  };

  // アップロード（保存）
  const handleUpload = async () => {
    const token = getToken();
    if(!token) { signIn(); return; }
    setStatus("loading");
    setMsg(null);
    try {
      const data = { ...appData, syncedAt: new Date().toISOString() };
      await uploadFile(token, driveFile?.id || null, data);
      await checkDriveFile();
      setMsg({ok:true, text:"Googleドライブに保存しました ✓"});
      setStatus("authed");
    } catch(e) {
      setMsg({ok:false, text:"保存失敗: "+e.message});
      setStatus("authed");
    }
  };

  // ダウンロード（読み込み）
  const handleDownload = async () => {
    const token = getToken();
    if(!token) { signIn(); return; }
    if(!driveFile) { setMsg({ok:false, text:"Driveにデータがありません"}); return; }
    setStatus("loading");
    setMsg(null);
    try {
      const data = await downloadFile(token, driveFile.id);
      if(!data.categories || !data.logs) throw new Error("データ形式が正しくありません");
      onRestore(data);
      setMsg({ok:true, text:"Driveからデータを読み込みました ✓"});
      setStatus("authed");
    } catch(e) {
      setMsg({ok:false, text:"読み込み失敗: "+e.message});
      setStatus("authed");
    }
  };

  const fmtDate = s => s ? new Date(s).toLocaleString("ja-JP", {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "なし";

  const bS = (bg, fg="#fff") => ({background:bg,color:fg,border:"none",borderRadius:10,padding:"13px 0",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT,width:"100%",marginBottom:8,display:"block"});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>

        {/* ヘッダー */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>☁️ Googleドライブ同期</div>
            <div style={{fontSize:11,color:sub}}>PC・iPhone間でデータを共有</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isAuthed && <button onClick={signOut} style={{background:"none",border:`1px solid ${border}`,borderRadius:8,padding:"5px 10px",color:muted,cursor:"pointer",fontSize:BASE_FONT-3}}>ログアウト</button>}
            <button onClick={onClose} style={{background:"none",border:"none",color:sub,fontSize:22,cursor:"pointer"}}>×</button>
          </div>
        </div>

        {/* Drive状態 */}
        {isAuthed && (
          <div style={{background:card2,borderRadius:10,padding:12,marginBottom:14,border:`1px solid ${border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:BASE_FONT-2,fontWeight:700,color:driveFile?"#34d399":muted}}>
                  {driveFile ? "✓ Driveにデータあり" : "Drive未保存"}
                </div>
                {driveFile && <div style={{fontSize:10,color:sub,marginTop:2}}>最終更新: {fmtDate(driveFile.modifiedTime)}</div>}
              </div>
              <div style={{width:10,height:10,borderRadius:"50%",background:driveFile?"#34d399":muted}}/>
            </div>
          </div>
        )}

        {/* メッセージ */}
        {msg && (
          <div style={{background:msg.ok?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${msg.ok?"#34d399":"#f87171"}`,borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:BASE_FONT-2,color:msg.ok?"#34d399":"#f87171",fontWeight:600}}>
            {msg.text}
          </div>
        )}

        {/* ローディング */}
        {status === "loading" && (
          <div style={{textAlign:"center",padding:"20px 0",color:sub,fontSize:BASE_FONT-1,marginBottom:12}}>
            ⏳ 処理中...
          </div>
        )}

        {/* 未ログイン */}
        {!isAuthed && status !== "loading" && (
          <>
            <div style={{textAlign:"center",padding:"16px 0 20px",color:sub,fontSize:BASE_FONT-1,lineHeight:1.7}}>
              Googleアカウントでサインインして<br/>データをドライブに保存・同期します
            </div>
            <button style={bS("#4285f4")} onClick={signIn}>Googleでサインイン</button>
          </>
        )}

        {/* ログイン済み */}
        {isAuthed && status !== "loading" && (
          <>
            {/* 保存 */}
            <button style={bS(accent)} onClick={handleUpload}>
              ⬆️ 今のデータをDriveに保存
            </button>

            {/* 読み込み */}
            <button
              onClick={handleDownload}
              disabled={!driveFile}
              style={{...bS(driveFile?"#34d399":"#2a2f3d"), opacity:driveFile?1:0.5, cursor:driveFile?"pointer":"not-allowed"}}
            >
              ⬇️ Driveからデータを読み込む
            </button>

            {/* 注意書き */}
            <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:8,padding:"10px 12px",fontSize:BASE_FONT-3,color:"#fbbf24",lineHeight:1.6}}>
              ⚠️ 読み込むと現在のデータが上書きされます。<br/>PC・iPhone両方で使う場合は、編集後に必ず「保存」してください。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
