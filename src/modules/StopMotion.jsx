import { useTheme } from "../theme";

/* Éléments de la planche « stop motion » (public/assets/sm) : fleurs, feuilles, perles, repères. */
export const useSM = () => useTheme().theme === "stopmotion";
export const Sprite = ({ n, className = "", style }) => <img src={`/assets/sm/${n}.png`} alt="" draggable={false} className={`pointer-events-none select-none ${className}`} style={style} />;

/* Lettres : chaque lettre est découpée dans la matière d'une pastille de la planche (texture + relief par ombres empilées). */
const LETTERS = [["green", "#14602a"], ["ctgreen", "#14602a"], ["blue", "#17518a"], ["yellow", "#9a6208"], ["red", "#8c1d30"], ["purple", "#4a2380"]];
const TEX = { green: "tex-green", ctgreen: "tex-ctgreen", blue: "tex-blue", yellow: "tex-yellow", red: "tex-red", purple: "tex-purple" };
const SEQ = ["green", "blue", "yellow", "red", "purple"];
export function ClayTitle({ text, size = 21, max = 13 }) {
  const t = text.length > max ? text.slice(0, max - 1) + "…" : text;
  return (
    <span className="inline-flex whitespace-nowrap font-black" style={{ fontSize: size, letterSpacing: ".01em" }} title={text}>
      {[...t].map((ch, i) => {
        const k = SEQ[i % SEQ.length], d = LETTERS.find(l => l[0] === k)[1];
        return <span key={i} className="clay-letter" style={{ backgroundImage: `url(/assets/sm/${TEX[k]}.jpg)`, "--ld": d }}>{ch === " " ? "\u00a0" : ch}</span>;
      })}
    </span>
  );
}

/* Repère de gravité : losange rouge (majeur), losange jaune (moyen), rond vert (mineur) */
export const FlagSprite = ({ severity, size = 16 }) => (
  <Sprite n={severity === "high" ? "diamond-red" : severity === "mid" ? "diamond-yellow" : "circle-green"} className="object-contain" style={{ width: size, height: size }} />
);

/* Pastille de menu : les six disques de la planche (crayon, feuille, clap, calendrier, grille, courbe) */
export const NavDisc = ({ i }) => <Sprite n={`disc${i}`} className="h-11 w-11 object-contain" />;

/* Décor végétal du panneau Script Doctor. Positions relevées sur la planche : [x, y, largeur, hauteur] dans le cadre de 446 × 696 px. */
const FW = 446, FH = 696, K = 0.76;
const DECOR = {
  "d-tl": [-27, 132, 50, 90], "d-l1": [-36, 231, 53, 50], "d-l2": [-40, 303, 67, 55], "d-l3": [-37, 342, 50, 51],
  "d-tr": [317, -17, 65, 52], "d-r1": [422, 64, 37, 105], "d-r2": [425, 252, 40, 58], "d-r3": [431, 321, 34, 35],
  "d-bl": [-31, 575, 83, 129], "d-br": [404, 543, 55, 164],
};
export const PanelDecor = () => Object.entries(DECOR).map(([n, [x, y, w, h]]) => {
  const bottom = y > 450;
  const s = { width: w * K, [x > FW / 2 ? "right" : "left"]: (x > FW / 2 ? FW - x - w : x) * K, ...(bottom ? { bottom: (FH - y - h) * K } : { top: y * K }) };
  return <Sprite key={n} n={n} className="absolute z-10" style={{ ...s, filter: "drop-shadow(0 2px 2px rgba(50,30,10,.35))" }} />;
});
