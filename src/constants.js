// ─── 定数・ヘルパー関数 ───────────────────────────────────────────────────────

export const DEFAULT_CATS = [
  { id:"study",    name:"勉強",   color:"#4f8ef7" },
  { id:"work",     name:"仕事",   color:"#a78bfa" },
  { id:"house",    name:"家事",   color:"#34d399" },
  { id:"exercise", name:"運動",   color:"#fb923c" },
  { id:"other",    name:"その他", color:"#94a3b8" },
];

export const PRESET_COLORS = [
  "#4f8ef7","#a78bfa","#34d399","#fb923c","#f87171",
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

// ─── テーマトークン生成 ────────────────────────────────────────────────────────
export const ACCENT_MAP = {
  blue:"#4f8ef7", green:"#34d399", purple:"#a78bfa",
  orange:"#fb923c", amber:"#fbbf24", pink:"#f472b6",
};

// アクセントカラーのRGB値からライトテーマ用の薄い色を生成
const accentTint = (hex, opacity) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  // 白(255)とアクセントをopacityで混合
  const mix = (c) => Math.round(255 - (255 - c) * opacity);
  return `#${mix(r).toString(16).padStart(2,"0")}${mix(g).toString(16).padStart(2,"0")}${mix(b).toString(16).padStart(2,"0")}`;
};

// ヒートマップ用：アクセントカラーの濃淡5段階を生成
export const buildHeatColors = (accent, isDark) => {
  if(isDark) {
    const r = parseInt(accent.slice(1,3),16);
    const g = parseInt(accent.slice(3,5),16);
    const b = parseInt(accent.slice(5,7),16);
    return [
      "#1e2330",                                          // 0分：ベース
      `rgba(${r},${g},${b},0.15)`,                       // 〜20分
      `rgba(${r},${g},${b},0.35)`,                       // 〜40分
      `rgba(${r},${g},${b},0.55)`,                       // 〜60分
      `rgba(${r},${g},${b},0.75)`,                       // 〜90分
      accent,                                             // 120分以上
    ];
  } else {
    return [
      accentTint(accent, 0.08),   // 0分：ほぼ白
      accentTint(accent, 0.25),   // 〜20分
      accentTint(accent, 0.45),   // 〜40分
      accentTint(accent, 0.65),   // 〜60分
      accentTint(accent, 0.82),   // 〜90分
      accent,                     // 120分以上
    ];
  }
};

export const buildTheme = () => {
  const isDark  = LS.get("tf_bgmode","dark") === "dark";
  const accent  = ACCENT_MAP[LS.get("tf_accent","blue")] || "#4f8ef7";
  const rgb     = hexRgb(accent);

  return {
    isDark,
    accent,
    // ── 基本トークン ──
    bg:     isDark ? "#0d0f14" : accentTint(accent, 0.06),  // 背景：アクセント極薄
    card:   isDark ? "#1e2330" : "#FFFFFF",
    card2:  isDark ? "#161920" : accentTint(accent, 0.12),  // カード内：アクセント薄
    border: isDark ? "#2a2f3d" : accentTint(accent, 0.28),  // ボーダー：アクセント薄め
    text:   isDark ? "#e8ecf4" : "#1F2937",
    sub:    isDark ? "#6b7a99" : "#6B7280",
    muted:  isDark ? "#3d4560" : "#9CA3AF",
    shadow: isDark ? "none"    : `0 2px 8px rgba(${rgb},0.08)`,
    // ── アクセント連動トークン ──
    accentBg:     isDark ? `rgba(${rgb},0.12)` : accentTint(accent, 0.14), // タブ選択背景など
    accentBorder: isDark ? `rgba(${rgb},0.3)`  : accentTint(accent, 0.45), // アクセント系ボーダー
    heatColors: buildHeatColors(accent, isDark),
  };
};

// ─── 日記ヘルパー ──────────────────────────────────────────────────────────────
export const getDiaryText  = d => typeof d === "object" ? d?.text  : d;
export const getDiaryColor = d => typeof d === "object" ? (d?.color || "none") : "none";
