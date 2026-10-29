import { useTheme } from "../theme";

/* Éléments du pack « stop motion » (public/assets/sm) : fleurs, feuilles, perles, repères. */
export const useSM = () => useTheme().theme === "stopmotion";
export const Sprite = ({ n, className = "", style }) => <img src={`/assets/sm/${n}.png`} alt="" draggable={false} className={`pointer-events-none select-none ${className}`} style={style} />;

const LETTERS = [["#3fae4f", "#1d6b2c"], ["#3a8fd8", "#1b5a93"], ["#f0a526", "#a96a0b"], ["#e0485e", "#962234"], ["#8a52c8", "#512584"]];
/* Titre en lettres de pâte à modeler multicolores */
export function ClayTitle({ text, size = 22 }) {
  return (
    <span className="inline-flex font-black" style={{ fontSize: size, lineHeight: 1, letterSpacing: "-.01em" }} title={text}>
      {[...text].map((ch, i) => {
        const [c, d] = LETTERS[i % LETTERS.length];
        return <span key={i} style={{ color: c, WebkitTextStroke: ".6px rgba(255,255,255,.4)", textShadow: `0 1px 0 ${d}, 0 2px 0 ${d}, 0 3px 0 ${d}, 0 4px 2px rgba(0,0,0,.38)` }}>{ch === " " ? "\u00a0" : ch}</span>;
      })}
    </span>
  );
}

/* Repère de gravité : losange rouge (majeur), losange jaune (moyen), rond vert (mineur) */
export const FlagSprite = ({ severity, size = 16 }) => (
  <Sprite n={severity === "high" ? "diamond-red" : severity === "mid" ? "diamond-yellow" : "circle-green"} className="object-contain" style={{ width: size, height: size }} />
);

/* Décor végétal autour du panneau Script Doctor (positions relatives au cadre) */
const DECOR = [
  { n: "leaf-xs", s: { right: 6, top: -12, width: 30, transform: "rotate(30deg)" } },
  { n: "branch", s: { left: -30, top: 70, height: 170 } },
  { n: "flower-red", s: { left: -20, top: 250, width: 30 } },
  { n: "leaf-b", s: { left: -34, top: 285, width: 40, transform: "rotate(-12deg)" } },
  { n: "leaf-a", s: { left: -28, top: 340, width: 26, transform: "rotate(12deg)" } },
  { n: "flower-red", s: { right: -14, top: 78, width: 26 } },
  { n: "flower-red", s: { right: -14, top: 118, width: 24 } },
  { n: "leaf-s", s: { right: -20, top: 150, width: 32, transform: "rotate(-10deg)" } },
  { n: "flower-purple-s", s: { right: -16, top: 235, width: 26 } },
  { n: "leaf-c", s: { right: -24, top: 520, width: 30, transform: "rotate(-20deg)" } },
  { n: "tuft", s: { left: -22, bottom: -16, width: 84 } },
  { n: "flower-red", s: { left: -6, bottom: 34, width: 30 } },
  { n: "flower-yellow-s", s: { left: 36, bottom: 40, width: 24 } },
  { n: "tuft", s: { right: -24, bottom: -16, width: 84, transform: "scaleX(-1)" } },
  { n: "flower-red", s: { right: 24, bottom: 36, width: 26 } },
  { n: "flower-purple-s", s: { right: -8, bottom: 30, width: 26 } },
];
export const PanelDecor = () => DECOR.map((d, i) => <Sprite key={i} n={d.n} className="absolute z-10" style={d.s} />);
