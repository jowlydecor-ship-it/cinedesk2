import { useMemo, useRef, useState } from "react";
import { fmt } from "../lib/doctor";
import { fmtDur } from "../lib/insights";
import { useTheme, usePalette } from "../theme";
import { shade } from "./Craft";

export const SEV_COLOR = { high: "#ff6b6b", mid: "#ffb020", low: "#6bb6ff" };
const RANK = { high: 3, mid: 2, low: 1 };
const ACT_LABELS = ["Acte I", "Acte II-A", "Acte II-B", "Acte III"];
const BEADS = ["#35a366", "#f2a71f", "#e8621b", "#7b3bc8"];            // perles : vert, jaune, orange, violet selon l'intensité
const beadOf = v => (v >= 7 ? 3 : v >= 5 ? 2 : v >= 3 ? 1 : 0);

/* Courbe de tension interactive : survol = scène + justification, clic = sélection.
   Rendu selon le thème : fil de laine et perles (pâte à modeler), trait pastel, ou verre lumineux. */
export default function TensionChart({ report, height = 150, compact = false, selected = null, onSelect }) {
  const { theme } = useTheme();
  const P = usePalette();
  const wrap = useRef(null);
  const [hover, setHover] = useState(null);
  const n = report.curve.length;
  const marks = useMemo(() => {
    const m = {};
    report.flaws.forEach(f => f.scenes.forEach(id => { if (!m[id] || RANK[f.severity] > RANK[m[id]]) m[id] = f.severity; }));
    return m;
  }, [report]);
  if (n < 2) return <p className="p-3 text-xs text-ink-mute">Il faut au moins 2 scènes pour tracer la courbe.</p>;

  const W = 640, H = height, pl = compact ? 10 : 34, pr = 12, pt = compact ? 18 : 30, pb = compact ? 16 : 30;
  const x = i => pl + (i * (W - pl - pr)) / (n - 1);
  const y = v => pt + (1 - v / 10) * (H - pt - pb);
  const pts = report.curve.map((v, i) => [x(i), y(v)]);
  const line = pts.map(([px, py], i) => {
    if (!i) return `M${px},${py}`;
    const [qx, qy] = pts[i - 1], mx = (qx + px) / 2;
    return `C${mx},${qy} ${mx},${py} ${px},${py}`;
  }).join(" ");
  const area = `${line} L${pts.at(-1)[0]},${H - pb} L${pts[0][0]},${H - pb} Z`;
  const gid = compact ? "tcA" : "tcB";
  const clay = theme === "clay", glass = theme === "glass";

  const move = e => {
    const r = wrap.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((vx - pl) / (W - pl - pr)) * (n - 1))));
    setHover({ i, px: e.clientX - r.left, py: e.clientY - r.top, w: r.width });
  };
  const info = hover ? report.scenes[hover.i] : null;
  const hoverFlaws = hover ? report.flaws.filter(f => f.scenes.includes(hover.i + 1)) : [];

  return (
    <div ref={wrap} className="relative" onMouseMove={move} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ cursor: onSelect ? "pointer" : "default" }} onClick={() => hover && onSelect?.(hover.i)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.fillA} stopOpacity={clay ? 0.28 : 0.5} /><stop offset="100%" stopColor={P.fillB} stopOpacity="0.04" /></linearGradient>
          <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={P.line} /><stop offset="100%" stopColor={P.trend} /></linearGradient>
          {BEADS.map((c, k) => (
            <radialGradient key={k} id={`${gid}b${k}`} cx=".32" cy=".28" r=".95"><stop offset="0" stopColor={shade(c, 0.65)} /><stop offset=".45" stopColor={c} /><stop offset="1" stopColor={shade(c, -0.35)} /></radialGradient>
          ))}
        </defs>

        {!compact && [0, 5, 10].map(v => (
          <g key={v}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={P.grid} strokeWidth="1.5" />
            <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={P.label}>{v}</text></g>
        ))}
        {!compact && [0.25, 0.5, 0.75].map(f => <line key={f} x1={pl + f * (W - pl - pr)} x2={pl + f * (W - pl - pr)} y1={pt - 6} y2={H - pb} stroke={P.grid} strokeDasharray="4 5" />)}
        {!compact && ACT_LABELS.map((a, k) => <text key={a} x={pl + (k * 0.25 + 0.125) * (W - pl - pr)} y={H - 8} textAnchor="middle" fontSize="11" fill={P.label}>{a}</text>)}
        {!compact && <><line x1={pl} x2={W - pr} y1={y(report.median)} y2={y(report.median)} stroke={P.median} strokeDasharray="6 5" strokeWidth="1.5" />
          <text x={W - pr} y={y(report.median) - 5} textAnchor="end" fontSize="10" fill={P.medianText}>médiane {fmt(report.median)}</text></>}
        {!compact && report.beats.filter(b => b.strict).map(b => (
          <g key={b.name}><line x1={x(b.scene - 1)} x2={x(b.scene - 1)} y1={pt - 22} y2={pt - 8} stroke={b.found ? P.ok : P.bad} strokeWidth="2" />
            <text x={x(b.scene - 1)} y={pt - 25} textAnchor="middle" fontSize="10" fontWeight="700" fill={b.found ? P.ok : P.bad}>{b.short}</text></g>
        ))}

        <path d={area} fill={`url(#${gid})`} />
        {!compact && <path d={report.trend.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={P.trend} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />}

        {clay ? (
          <g>                                                           {/* fil de laine torsadé */}
            <path d={line} fill="none" stroke="rgba(60,30,10,.28)" strokeWidth={compact ? 7 : 9} strokeLinecap="round" transform="translate(1.5 3.5)" />
            <path d={line} fill="none" stroke="#e8621b" strokeWidth={compact ? 5.5 : 7.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d={line} fill="none" stroke="#f6c85a" strokeWidth={compact ? 5.5 : 7.5} strokeDasharray="4 8" />
            <path d={line} fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" strokeLinecap="round" transform="translate(0 -2)" />
          </g>
        ) : glass ? (
          <g><path d={line} fill="none" stroke={`url(#${gid}g)`} strokeWidth={compact ? 3.5 : 4.5} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 3px 5px rgba(61,124,240,.45))" }} />
            <path d={line} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" transform="translate(0 -1.5)" /></g>
        ) : (
          <path d={line} fill="none" stroke={P.line} strokeWidth={compact ? 3.5 : 4.5} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {selected != null && <line x1={x(selected)} x2={x(selected)} y1={pt - 6} y2={H - pb} stroke={P.sel} strokeWidth="2.5" />}
        {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={pt - 6} y2={H - pb} stroke={P.sel} strokeWidth="1.5" strokeDasharray="3 3" />}

        {pts.map(([px, py], i) => {
          const role = report.scenes[i].role, on = hover?.i === i || selected === i, v = report.curve[i];
          const r = on ? 10 : role ? 9 : 6.5;
          return (
            <g key={i}>
              {clay ? (
                <g>
                  <ellipse cx={px + 2} cy={py + r * 0.9} rx={r * 0.9} ry={r * 0.35} fill="rgba(60,30,10,.3)" />
                  <circle cx={px} cy={py} r={r} fill={`url(#${gid}b${beadOf(v)})`} stroke={on ? P.sel : "none"} strokeWidth="2.5" />
                  <ellipse cx={px - r * 0.3} cy={py - r * 0.38} rx={r * 0.36} ry={r * 0.22} fill="#fff" opacity=".55" />
                </g>
              ) : (
                <g>
                  <circle cx={px} cy={py} r={r - 1.5} fill={role === "pic" ? P.peak : role === "creux" ? P.valley : "#fff"} stroke={on ? P.sel : P.line} strokeWidth={on ? 3.5 : 2.5} />
                  {glass && <ellipse cx={px - 1.5} cy={py - 2} rx="2.6" ry="1.5" fill="#fff" opacity=".9" />}
                </g>
              )}
              {!compact && role === "pic" && <text x={px} y={py - r - 5} textAnchor="middle" fontSize="12" fill={P.peak}>▲</text>}
              {!compact && role === "creux" && <text x={px} y={py + r + 14} textAnchor="middle" fontSize="12" fill={P.valley}>▼</text>}
              {marks[i + 1] && <rect x={px - 4.5} y={H - pb + 9} width="9" height="9" rx="2" transform={`rotate(45 ${px} ${H - pb + 13.5})`} fill={SEV_COLOR[marks[i + 1]]} stroke="#fff" strokeWidth="1.5" />}
            </g>
          );
        })}
      </svg>

      {hover && info && (
        <div className="pointer-events-none absolute z-50 w-72 clay-card p-3 text-xs leading-snug"
             style={{ left: Math.max(0, Math.min(hover.px + 14, hover.w - 290)), top: hover.py + 16 }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-bold text-ink">Scène {info.id}</span><span className="text-[10px] font-semibold text-ink-mute">≈ {fmtDur(info.minute)}</span>
            {info.role && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${info.role === "pic" ? "bg-[#ffd9cc] text-[#c4421c]" : "bg-[#d3ecff] text-[#2a6fb0]"}`}>{info.role === "pic" ? "▲ pic" : "▼ creux"}</span>}
            <span className="ml-auto text-base font-extrabold" style={{ color: P.peak }}>{fmt(info.value)}<span className="text-[10px] font-semibold text-ink-mute">/10</span></span>
          </div>
          <div className="mb-1.5 truncate font-semibold text-ink-soft">{info.heading}</div>
          <p className="text-ink-soft">{info.summary}</p>
          {info.trend && <p className="mt-1 font-semibold text-ink">↳ {info.trend}</p>}
          {hoverFlaws.length > 0 && (
            <div className="mt-2 space-y-1">
              {hoverFlaws.slice(0, 3).map(f => <div key={f.id} className="flex items-center gap-1.5 font-semibold text-ink"><span className="h-2 w-2 rotate-45" style={{ background: SEV_COLOR[f.severity] }} />{f.title}</div>)}
            </div>
          )}
          {onSelect && <div className="mt-2 text-[10px] text-ink-mute">Cliquez pour épingler cette scène</div>}
        </div>
      )}
    </div>
  );
}
