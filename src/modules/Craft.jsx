/* Éléments « craft » : boutons de vêtements cousus en pâte à modeler et rubans adhésifs. */
import { useTheme } from "../theme";

export const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join("");
};

export function SewnButton({ size = 32, color = "#ff9d9d", holes = 4, thread = "#fff4d6", className = "", style }) {
  const { theme } = useTheme();
  const id = `sb${color.slice(1)}${holes}${theme}`;
  const dark = shade(color, -0.3), light = shade(color, 0.6);
  const shadow = "drop-shadow(2px 4px 3px rgba(70,40,20,.35))";
  if (theme === "glass") {                                  // orbe de verre
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className} style={{ filter: "drop-shadow(0 4px 6px rgba(30,60,130,.35))", flexShrink: 0, ...style }} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}g`} cx=".35" cy=".28" r=".85"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".45" stopColor={light} stopOpacity=".85" /><stop offset="1" stopColor={color} stopOpacity=".9" /></radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={`url(#${id}g)`} stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" />
        <ellipse cx="18" cy="13" rx="9" ry="5" fill="#fff" opacity=".7" />
      </svg>
    );
  }
  const pts = holes === 2 ? [[18.5, 24], [29.5, 24]] : [[18.5, 18.5], [29.5, 18.5], [18.5, 29.5], [29.5, 29.5]];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} style={{ filter: shadow, flexShrink: 0, ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}b`} cx=".3" cy=".25" r=".95"><stop offset="0" stopColor={light} /><stop offset=".45" stopColor={color} /><stop offset="1" stopColor={dark} /></radialGradient>
        <radialGradient id={`${id}d`} cx=".72" cy=".78" r=".95"><stop offset="0" stopColor={light} stopOpacity=".75" /><stop offset=".55" stopColor={color} /><stop offset="1" stopColor={dark} /></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={`url(#${id}b)`} />
      <circle cx="24" cy="24" r="21" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1" />
      {holes === 0 ? <ellipse cx="17" cy="14" rx="8" ry="5" fill="#fff" opacity=".5" /> : (
        <>
          <circle cx="24" cy="24" r="15.5" fill={`url(#${id}d)`} stroke={dark} strokeOpacity=".35" strokeWidth="1.2" />
          {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.8" fill="#3a2f5e" stroke={light} strokeOpacity=".7" strokeWidth=".8" />)}
          <path d={holes === 2 ? "M18.5 24 L29.5 24" : "M18.5 18.5 L29.5 29.5 M29.5 18.5 L18.5 29.5"} stroke="rgba(60,40,100,.35)" strokeWidth="3" strokeLinecap="round" transform="translate(.6 .9)" />
          <path d={holes === 2 ? "M18.5 24 L29.5 24" : "M18.5 18.5 L29.5 29.5 M29.5 18.5 L18.5 29.5"} stroke={thread} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export const Tape = ({ color = "#ffc4d8", rotate = -4, className = "", style }) => (
  <div className={`washi ${className}`} style={{ "--c": color, transform: `rotate(${rotate}deg)`, ...style }} />   /* masqué par le thème Liquid Glass */
);

/* angle stable (±2°) dérivé de l'identifiant, pour un côté « posé à la main » */
export const tilt = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return (Math.abs(h) % 41) / 10 - 2; };
