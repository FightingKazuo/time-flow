// ─── 定数・ヘルパー関数 ───────────────────────────────────────────────────────

export const DEFAULT_CATS = [
  { id:"study",    name:"勉強",   color:"#4f9eff" },
  { id:"work",     name:"仕事",   color:"#a78bfa" },
  { id:"house",    name:"家事",   color:"#34d399" },
  { id:"exercise", name:"運動",   color:"#fb923c" },
  { id:"other",    name:"その他", color:"#94a3b8" },
];

export const PRESET_COLORS = [
  "#4f9eff","#a78bfa","#34d399","#fb923c","#f87171",
  "#fbbf24","#e879f9","#2dd4bf","#f472b6","#94a3b8",
];

export const DAYS_LABEL = ["月","火","水","木","金","土","日"];
export const BASE_FONT  = 17;

export const WEEKLY_DEFAULTS = [
  { label:"英語単語", days:[0,1,2,3,4] },
  { label:"読書",     days:[0,1,2,3,4,5,6] },
];

// ─── フォーマット ──────────────────────────────────────────────────────────────
export const pad     = n => String(n).padStart(2,"0");
export const fmtTime = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
export const fmtHMS  = s => {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if(h>0) return `${h}時間${m}分${sec}秒`;
  if(m>0) return `${m}分${sec}秒`;
  return `${sec}秒`;
};
export const fmtHM   = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h&&m?`${h}h${m}m`:h?`${h}h`:`${m}m`; };
export const fmtDate = d => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
export const todayStr = () => fmtDate(new Date());
export const hexRgb   = h => `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;

// ─── 週・日付 ──────────────────────────────────────────────────────────────────
export const getWeekMonday = () => {
  const d=new Date(), day=d.getDay();
  d.setDate(d.getDate()+(day===0?-6:1-day)); d.setHours(0,0,0,0); return d;
};
export const getDayDate  = idx => { const m=getWeekMonday(); m.setDate(m.getDate()+idx); return m; };
export const dayDateStr  = idx => { const d=getDayDate(idx); return `${d.getMonth()+1}/${d.getDate()}`; };
export const todayDayIdx = () => { const d=new Date().getDay(); return d===0?6:d-1; };

export const buildWeeklyTasks = tpls => Object.fromEntries(
  DAYS_LABEL.map((_,i)=>[i, tpls.filter(t=>t.days.includes(i)).map(t=>({
    id:`w_${t.label}_${i}`, label:t.label, done:false, weekly:true
  }))])
);

// ─── localStorage ──────────────────────────────────────────────────────────────
const _store = {};
export const LS = {
  get: (k,d) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):(_store[k]??d); }catch{ return _store[k]??d; } },
  set: (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} _store[k]=v; },
};

export const notify = (title, body) => {
  if("Notification" in window && Notification.permission==="granted")
    new Notification(title, {body});
};
