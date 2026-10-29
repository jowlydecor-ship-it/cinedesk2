import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* Quatre thèmes : « stopmotion » (par défaut), « clay » (pâte à modeler beige), « pastel » (précédent), « glass » (Liquid Glass). */
export const THEMES = [
  { id: "stopmotion", label: "Stop motion", desc: "Plasticine photographiée image par image : barre pêche, feuille de papier, fleurs, feuilles, perles et branche.", swatch: ["#d9a58a", "#3fa84e", "#f3c32c", "#2f86d4", "#e0485e"] },
  { id: "clay", label: "Pâte à modeler", desc: "Beige chaud, plasticine texturée, papier déchiré, fils et perles.", swatch: ["#e8dbc3", "#2f9e5b", "#f2a71f", "#e8621b", "#7b3bc8"] },
  { id: "pastel", label: "Pastel craft (précédent)", desc: "Lavande douce, coutures et boutons cousus.", swatch: ["#f1e8ff", "#9fd4ff", "#ffdf6e", "#ff9d9d", "#8fe8c2"] },
  { id: "glass", label: "Liquid Glass", desc: "Verre dépoli translucide, reflets et reliefs lumineux, façon Apple.", swatch: ["#dfe9ff", "#7fc0ff", "#b49bff", "#ffab7a", "#74e0b6"] },
];

/* Couleurs des graphiques (attributs SVG : pas de variables CSS possibles) */
export const PALETTES = {
  pastel: { grid: "#e3dbf7", label: "#a49cc8", median: "#b9aee6", medianText: "#8a82b3", line: "#ff8a5b", fillA: "#ff9d6b", fillB: "#ffb3d1", trend: "#8d6bff", sel: "#8d6bff", ok: "#2fbf8f", bad: "#ff6b6b", peak: "#ff7a59", valley: "#6bb6ff" },
  clay: { grid: "rgba(110,78,45,.22)", label: "#a08d76", median: "#b79f82", medianText: "#8a755c", line: "#e8621b", fillA: "#f2a71f", fillB: "#e8621b", trend: "#7b3bc8", sel: "#7b3bc8", ok: "#2f9e5b", bad: "#d94a2a", peak: "#e8621b", valley: "#35a366" },
  stopmotion: { grid: "rgba(110,80,50,.25)", label: "#8a7a68", median: "#a8926f", medianText: "#6f5d48", line: "#c9b48a", fillA: "#e9c98a", fillB: "#d9a58a", trend: "#8a52c8", sel: "#8a52c8", ok: "#3fa84e", bad: "#d9475e", peak: "#d9475e", valley: "#2f86d4" },
  glass: { grid: "rgba(255,255,255,.85)", label: "#6c7fa6", median: "#8aa0cc", medianText: "#5c7099", line: "#3d7cf0", fillA: "#7fb4ff", fillB: "#c8a6ff", trend: "#b06bff", sel: "#2f6df6", ok: "#1fa97a", bad: "#f0555a", peak: "#ff7a59", valley: "#3d9bff" },
};

const KEY = "cinedesk.theme", VER = "cinedesk.theme.ver";
/* Stop motion est le thème par défaut : à la première ouverture de cette version, il remplace l'ancien choix. */
const read = () => {
  try {
    if (localStorage.getItem(VER) !== "3") { localStorage.setItem(VER, "3"); localStorage.setItem(KEY, "stopmotion"); return "stopmotion"; }
    const v = localStorage.getItem(KEY);
    return THEMES.some(t => t.id === v) ? v : "stopmotion";
  } catch { return "stopmotion"; }
};
const Ctx = createContext({ theme: "stopmotion", setTheme() {} });
export const useTheme = () => useContext(Ctx);
export const usePalette = () => PALETTES[useTheme().theme] || PALETTES.stopmotion;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* stockage indisponible */ }
  }, [theme]);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* Filtres SVG partagés : bords déchirés du papier (thème beige), irrégularité de la branche (stop motion) */
export const SvgDefs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
    <defs>
      <filter id="deckle" x="-4%" y="-3%" width="108%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="twig" x="-3%" y="-2%" width="106%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="9" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);
