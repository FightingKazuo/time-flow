import { pad } from "../constants";

export default function RingTimer({ elapsed, total, running, color, theme }) {
  const r=88, circ=2*Math.PI*r;
  const prog = total>0 ? Math.min(elapsed/total,1) : (elapsed%3600)/3600;
  const dash = circ*(1-prog);
  const rc   = total>0 ? (prog<0.6?"#34d399":prog<0.85?"#fb923c":"#f87171") : color;
  const dm   = total>0 ? pad(Math.floor((total-elapsed)/60)) : pad(Math.floor((elapsed%3600)/60));
  const ds   = total>0 ? pad((total-elapsed)%60) : pad(elapsed%60);
  const dh   = total===0 ? pad(Math.floor(elapsed/3600)) : null;

  const textColor  = theme?.text  || "#e8ecf4";
  const trackColor = theme?.card  || "#1e2330";
  const mutedColor = theme?.muted || "#3d4560";

  // 一時停止中：リング色を薄くして点滅
  const isPaused  = !running && elapsed > 0;
  const ringColor = isPaused ? `${rc}66` : rc;

  return (
    <svg width="240" height="240" viewBox="0 0 220 220">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="cg">
          <stop offset="0%" stopColor={rc} stopOpacity={isPaused?"0.05":"0.12"}/>
          <stop offset="100%" stopColor={rc} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {isPaused && (
        <style>{`@keyframes pausePulse{0%,100%{opacity:1}50%{opacity:0.3}}.pause-ring{animation:pausePulse 1.6s ease-in-out infinite}`}</style>
      )}

      <circle cx="110" cy="110" r="100" fill="url(#cg)"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke={trackColor} strokeWidth="14"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke={ringColor} strokeWidth="14"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
        transform="rotate(-90 110 110)"
        filter={isPaused?"none":"url(#glow)"}
        className={isPaused?"pause-ring":""}
        style={{transition:"stroke-dashoffset 1s linear,stroke 0.5s"}}/>

      {/* 進行ドット（計測中のみ） */}
      {prog>0.01 && running && (
        <circle cx={110+r*Math.cos(2*Math.PI*prog-Math.PI/2)} cy={110+r*Math.sin(2*Math.PI*prog-Math.PI/2)} r="7" fill={rc} filter="url(#glow)"/>
      )}

      {/* 一時停止アイコン */}
      {isPaused && (
        <>
          <rect x="97" y="88" width="9" height="26" rx="3" fill={`${rc}88`}/>
          <rect x="114" y="88" width="9" height="26" rx="3" fill={`${rc}88`}/>
        </>
      )}

      {dh && <text x="110" y="95" textAnchor="middle" fill={theme?.sub||"#6b7a99"} fontSize="14" fontFamily="monospace" opacity={isPaused?0.5:1}>{dh}h</text>}
      <text x="110" y={dh?"122":"118"} textAnchor="middle" fill={isPaused?`${textColor}66`:textColor} fontSize={dh?"32":"38"} fontWeight="800" fontFamily="monospace">{dm}:{ds}</text>
      <text x="110" y="142" textAnchor="middle"
        fill={running ? rc : isPaused ? `${rc}88` : mutedColor}
        fontSize="12" fontFamily="monospace" fontWeight="600">
        {running ? "● REC" : isPaused ? "⏸ PAUSE" : "○ READY"}
      </text>
    </svg>
  );
}
