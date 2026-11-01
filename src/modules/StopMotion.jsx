import { useTheme } from "../theme";

/* Éléments de la planche « stop motion » (public/assets/sm) : fleurs, feuilles, perles, repères. */
export const useSM = () => useTheme().theme === "stopmotion";
export const Sprite = ({ n, className = "", style }) => <img src={`/assets/sm/${n}.png`} alt="" draggable={false} className={`pointer-events-none select-none ${className}`} style={style} />;

/* Lettres pastel façon pâte à modeler : couleur + relief par ombres empilées (rien n'est rogné). */
const LETTERS = [["#3fae4a", "#1c6b2b"], ["#2f86d6", "#17518a"], ["#f2b91f", "#9a6208"], ["#e24a60", "#8c1d30"], ["#8a52c8", "#4a2380"]];
export function ClayTitle({ text, size = 21, max = 13 }) {
  const t = text.length > max ? text.slice(0, max - 1) + "…" : text;
  return (
    <span className="inline-flex whitespace-nowrap" style={{ fontSize: size, letterSpacing: ".03em" }} title={text}>
      {[...t].map((ch, i) => {
        const [c, d] = LETTERS[i % LETTERS.length];
        return <span key={i} className="clay-letter" style={{ "--lc": c, "--ld": d }}>{ch === " " ? "\u00a0" : ch}</span>;
      })}
    </span>
  );
}

/* Repère de gravité : losange rouge (majeur), losange jaune (moyen), rond vert (mineur) */
export const FlagSprite = ({ severity, size = 16 }) => (
  <Sprite n={severity === "high" ? "diamond-red" : severity === "mid" ? "diamond-yellow" : "circle-green"} className="object-contain" style={{ width: size, height: size }} />
);

/* Pastille de menu : les six disques de la planche (crayon, feuille, clap, calendrier, grille, courbe) */
export const NavDisc = ({ i }) => <Sprite n={`disc${i}`} className="h-9 w-9 object-contain" />;

/* Décor végétal du panneau Script Doctor. Positions relevées sur la planche : [x, y, largeur, hauteur] dans le cadre de 446 × 696 px.
   Chaque élément est un découpage complet (aucune feuille rognée) ; la vigne de gauche est faite de trois morceaux : feuilles, tronc répété, fleur + touffe. */
const FW = 446, FH = 696, K = 0.76;
const DECOR = [
  ["d-tl", -27, 132, 50, 90], ["d-tr", 317, -17, 65, 52], ["d-r1", 422, 64, 37, 105], ["d-r2", 425, 252, 40, 58], ["d-r3", 431, 321, 34, 35],
  ["d-br", 372, 560, 84, 140], ["d-r3", 352, 648, 36, 38], ["d-bl", 26, 648, 40, 44],
];
export const PanelDecor = () => (
  <>
    <div className="pointer-events-none absolute z-10 flex flex-col" style={{ left: -9, top: 150, bottom: 8, width: 44 }}>
      <Sprite n="vine-top" className="w-full shrink-0" />
      <div className="-my-px min-h-0 flex-1" style={{ background: "url(/assets/sm/vine-mid.png) top center / 100% auto repeat-y" }} />
      <Sprite n="vine-bottom" className="w-full shrink-0" />
    </div>
    {DECOR.map(([n, x, y, w, h], k) => {
      const bottom = y > 450;
      const s = { width: w * K, [x > FW / 2 ? "right" : "left"]: (x > FW / 2 ? FW - x - w : x) * K, ...(bottom ? { bottom: (FH - y - h) * K } : { top: y * K }) };
      return <Sprite key={n + k} n={n} className="absolute z-10" style={{ ...s, filter: "drop-shadow(0 2px 2px rgba(50,30,10,.35))" }} />;
    })}
  </>
);
