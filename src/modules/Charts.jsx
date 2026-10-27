import { useRef, useState } from "react";
import { usePalette } from "../theme";

const W = 640;
function useHover(n, pl, pr) {
  const ref = useRef(null);
  const [h, setH] = useState(null);
  const move = e => {
    const r = ref.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((vx - pl) / (W - pl - pr)) * (n - 1))));
    setH({ i, px: e.clientX - r.left, py: e.clientY - r.top, w: r.width });
  };
  return { ref, h, move, leave: () => setH(null) };
}
const Tip = ({ h, children }) => h && children ? (
  <div className="pointer-events-none absolute z-50 w-60 clay-card p-3 text-xs leading-snug text-ink-soft"
       style={{ left: Math.max(0, Math.min(h.px + 14, h.w - 250)), top: h.py + 16 }}>{children}</div>
) : null;

/* Courbes multiples : survol = valeurs de chaque série à la scène. */
export function LineChart({ series, height = 170, yFmt = v => v, tip, n = series[0]?.values.length || 0 }) {
  const P = usePalette();
  const pl = 40, pr = 12, pt = 14, pb = 26, H = height;
  const { ref, h, move, leave } = useHover(n, pl, pr);
  const yMax = Math.max(1, ...series.flatMap(s => s.values));
  const x = i => pl + (n > 1 ? (i * (W - pl - pr)) / (n - 1) : (W - pl - pr) / 2);
  const y = v => pt + (1 - v / yMax) * (H - pt - pb);
  return (
    <div ref={ref} className="relative" onMouseMove={move} onMouseLeave={leave}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
        {[0, 0.5, 1].map(f => <g key={f}><line x1={pl} x2={W - pr} y1={y(yMax * f)} y2={y(yMax * f)} stroke={P.grid} strokeWidth="1.5" /><text x={pl - 6} y={y(yMax * f) + 4} textAnchor="end" fontSize="10" fill={P.label}>{yFmt(Math.round(yMax * f))}</text></g>)}
        {Array.from({ length: n }, (_, i) => (n <= 24 || i % Math.ceil(n / 24) === 0) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill={P.label}>{i + 1}</text>)}
        {series.map(s => <path key={s.name} d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dash || undefined} />)}
        {h && <line x1={x(h.i)} x2={x(h.i)} y1={pt} y2={H - pb} stroke={P.sel} strokeDasharray="3 3" />}
        {h && series.map(s => <circle key={s.name} cx={x(h.i)} cy={y(s.values[h.i])} r="5" fill="#fff" stroke={s.color} strokeWidth="3" />)}
      </svg>
      <Tip h={h}>{h && tip(h.i)}</Tip>
    </div>
  );
}

/* Barres (empilées si plusieurs séries) : une barre par scène. */
export function BarChart({ series, height = 150, yFmt = v => v, tip, color, n = series[0]?.values.length || 0 }) {
  const P = usePalette();
  const pl = 40, pr = 12, pt = 12, pb = 24, H = height;
  const { ref, h, move, leave } = useHover(n, pl, pr);
  const totals = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const yMax = Math.max(1e-6, ...totals);
  const slot = (W - pl - pr) / n, bw = Math.max(3, slot * 0.68);
  const y = v => pt + (1 - v / yMax) * (H - pt - pb);
  return (
    <div ref={ref} className="relative" onMouseMove={move} onMouseLeave={leave}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
        {[0, 0.5, 1].map(f => <g key={f}><line x1={pl} x2={W - pr} y1={y(yMax * f)} y2={y(yMax * f)} stroke={P.grid} strokeWidth="1.5" /><text x={pl - 6} y={y(yMax * f) + 4} textAnchor="end" fontSize="10" fill={P.label}>{yFmt(yMax * f)}</text></g>)}
        {Array.from({ length: n }, (_, i) => {
          let acc = 0;
          const bx = pl + i * slot + (slot - bw) / 2;
          return (
            <g key={i} opacity={h && h.i !== i ? 0.55 : 1}>
              {series.map((s, k) => { const v = s.values[i], top = y(acc + v), hgt = Math.max(0, y(acc) - top); acc += v;
                return <rect key={k} x={bx} y={top} width={bw} height={hgt} rx="3" fill={color ? color(i) : s.color} />; })}
              {(n <= 24 || i % Math.ceil(n / 24) === 0) && <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill={P.label}>{i + 1}</text>}
            </g>
          );
        })}
      </svg>
      <Tip h={h}>{h && tip(h.i)}</Tip>
    </div>
  );
}
