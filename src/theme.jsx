import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* Trois thèmes : « clay » (nouveau, par défaut), « pastel » (précédent), « glass » (Liquid Glass). */
export const THEMES = [
  { id: "clay", label: "Pâte à modeler", desc: "Beige chaud, plasticine texturée, papier déchiré, fils et perles.", swatch: ["#e8dbc3", "#2f9e5b", "#f2a71f", "#e8621b", "#7b3bc8"] },
  { id: "pastel", label: "Pastel craft (précédent)", desc: "Lavande douce, coutures et boutons cousus.", swatch: ["#f1e8ff", "#9fd4ff", "#ffdf6e", "#ff9d9d", "#8fe8c2"] },
  { id: "glass", label: "Liquid Glass", desc: "Verre dépoli translucide, reflets et reliefs lumineux, façon Apple.", swatch: ["#dfe9ff", "#7fc0ff", "#b49bff", "#ffab7a", "#74e0b6"] },
];

/* Couleurs des graphiques (attributs SVG : pas de variables CSS possibles) */
export const PALETTES = {
  pastel: { grid: "#e3dbf7", label: "#a49cc8", median: "#b9aee6", medianText: "#8a82b3", line: "#ff8a5b", fillA: "#ff9d6b", fillB: "#ffb3d1", trend: "#8d6bff", sel: "#8d6bff", ok: "#2fbf8f", bad: "#ff6b6b", peak: "#ff7a59", valley: "#6bb6ff" },
  clay: { grid: "rgba(110,78,45,.22)", label: "#a08d76", median: "#b79f82", medianText: "#8a755c", line: "#e8621b", fillA: "#f2a71f", fillB: "#e8621b", trend: "#7b3bc8", sel: "#7b3bc8", ok: "#2f9e5b", bad: "#d94a2a", peak: "#e8621b", valley: "#35a366" },
  glass: { grid: "rgba(255,255,255,.85)", label: "#6c7fa6", median: "#8aa0cc", medianText: "#5c7099", line: "#3d7cf0", fillA: "#7fb4ff", fillB: "#c8a6ff", trend: "#b06bff", sel: "#2f6df6", ok: "#1fa97a", bad: "#f0555a", peak: "#ff7a59", valley: "#3d9bff" },
};

const KEY = "cinedesk.theme";
const read = () => { try { const v = localStorage.getItem(KEY); return THEMES.some(t => t.id === v) ? v : "clay"; } catch { return "clay"; } };
const Ctx = createContext({ theme: "clay", setTheme() {}, crayon: false });
export const useTheme = () => useContext(Ctx);
export const usePalette = () => PALETTES[useTheme().theme] || PALETTES.clay;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);
  const [crayon, setCrayon] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* stockage indisponible */ }
  }, [theme]);
  useEffect(() => {                                   // la vraie police « Crayon Hand » est-elle installée ?
    const root = document.documentElement;
    root.classList.add("no-crayon-font");             // sinon : police approchante + effet crayon
    document.fonts?.load?.('16px "Crayon Hand"').then(f => { if (f.length) { root.classList.remove("no-crayon-font"); setCrayon(true); } }).catch(() => {});
  }, []);
  const value = useMemo(() => ({ theme, setTheme, crayon }), [theme, crayon]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* Filtres SVG partagés : bords déchirés du papier, grain « crayon » du texte des post-it */
export const SvgDefs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
    <defs>
      <filter id="deckle" x="-4%" y="-3%" width="108%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="crayon" x="-2%" y="-6%" width="104%" height="112%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -2.2" result="grain" />
        <feComposite in="d" in2="grain" operator="in" />
      </filter>
    </defs>
  </svg>
);
