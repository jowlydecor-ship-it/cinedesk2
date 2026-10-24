import { useMemo, useRef, useState } from "react";
import { fmt } from "../lib/doctor";

export const SEV_COLOR = { high: "#ff6b6b", mid: "#ffb020", low: "#6bb6ff" };
const RANK = { high: 3, mid: 2, low: 1 };
const ACT_LABELS = ["Acte I", "Acte II-A", "Acte II-B", "Acte III"];

/* Courbe de tension interactive : survol = scène + justification, clic = sélection. */
export default function TensionChart({ report, height = 150, compact = false, selected = null, onSelect }) {
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ cursor: onSelect ? "pointer" : "default" }}
           onClick={() => hover && onSelect?.(hover.i)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9d6b" stopOpacity="0.55" /><stop offset="100%" stopColor="#ffb3d1" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {!compact && [0, 5, 10].map(v => (
          <g key={v}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#e3dbf7" strokeWidth="1.5" />
            <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#a49cc8">{v}</text></g>
        ))}
        {!compact && [0.25, 0.5, 0.75].map(f => <line key={f} x1={pl + f * (W - pl - pr)} x2={pl + f * (W - pl - pr)} y1={pt - 6} y2={H - pb} stroke="#d9cff7" strokeDasharray="4 5" />)}
        {!compact && ACT_LABELS.map((a, k) => <text key={a} x={pl + (k * 0.25 + 0.125) * (W - pl - pr)} y={H - 8} textAnchor="middle" fontSize="11" fill="#a49cc8">{a}</text>)}
        {!compact && <><line x1={pl} x2={W - pr} y1={y(report.median)} y2={y(report.median)} stroke="#b9aee6" strokeDasharray="6 5" strokeWidth="1.5" />
          <text x={W - pr} y={y(report.median) - 5} textAnchor="end" fontSize="10" fill="#8a82b3">médiane {fmt(report.median)}</text></>}
        {!compact && report.beats.filter(b => b.strict).map(b => (
          <g key={b.name}><line x1={x(b.scene - 1)} x2={x(b.scene - 1)} y1={pt - 22} y2={pt - 8} stroke={b.found ? "#2fbf8f" : "#ff6b6b"} strokeWidth="2" />
            <text x={x(b.scene - 1)} y={pt - 25} textAnchor="middle" fontSize="10" fontWeight="700" fill={b.found ? "#1f9b72" : "#e04848"}>{b.name.replace("Premier point de bascule", "Pivot 1").replace("Second point de bascule", "Pivot 2")}</text></g>
        ))}

        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="#ff8a5b" strokeWidth={compact ? 3.5 : 4.5} strokeLinecap="round" strokeLinejoin="round" />

        {selected != null && <line x1={x(selected)} x2={x(selected)} y1={pt - 6} y2={H - pb} stroke="#8d6bff" strokeWidth="2.5" />}
        {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={pt - 6} y2={H - pb} stroke="#8d6bff" strokeWidth="1.5" strokeDasharray="3 3" />}

        {pts.map(([px, py], i) => {
          const role = report.scenes[i].role, on = hover?.i === i || selected === i;
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={on ? 8 : role ? 6.5 : 4.5} fill={role === "pic" ? "#ff7a59" : role === "creux" ? "#6bb6ff" : "#fff"} stroke={on ? "#8d6bff" : "#ff8a5b"} strokeWidth={on ? 3.5 : 2.5} />
              {!compact && role === "pic" && <text x={px} y={py - 12} textAnchor="middle" fontSize="12" fill="#e5532d">▲</text>}
              {!compact && role === "creux" && <text x={px} y={py + 20} textAnchor="middle" fontSize="12" fill="#3a8fd9">▼</text>}
              {marks[i + 1] && <rect x={px - 4.5} y={H - pb + 9} width="9" height="9" rx="2" transform={`rotate(45 ${px} ${H - pb + 13.5})`} fill={SEV_COLOR[marks[i + 1]]} stroke="#fff" strokeWidth="1.5" />}
              {!compact && n <= 40 && <text x={px} y={H - pb + 30} textAnchor="middle" fontSize="9" fill="#a49cc8" style={{ display: "none" }}>{i + 1}</text>}
            </g>
          );
        })}
      </svg>

      {hover && info && (
        <div className="pointer-events-none absolute z-50 w-72 clay-card p-3 text-xs leading-snug"
             style={{ left: Math.max(0, Math.min(hover.px + 14, hover.w - 290)), top: hover.py + 16 }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-bold text-ink">Scène {info.id}</span>
            {info.role && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${info.role === "pic" ? "bg-[#ffd9cc] text-[#c4421c]" : "bg-[#d3ecff] text-[#2a6fb0]"}`}>{info.role === "pic" ? "▲ pic" : "▼ creux"}</span>}
            <span className="ml-auto text-base font-extrabold text-[#ff7a59]">{fmt(info.value)}<span className="text-[10px] font-semibold text-ink-mute">/10</span></span>
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
