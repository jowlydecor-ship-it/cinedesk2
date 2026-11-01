import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* Sept thèmes : « stopmotion » (par défaut), « clay » (pâte à modeler beige), « pastel » (précédent), « glass » (Liquid Glass),
   puis « clean » (Script Studio clair), « gothic » (AIRBOX Frankenweenie) et « adibou » (cabane en bois). Chaque thème récent a sa feuille dans src/themes/. */
export const THEMES = [
  { id: "stopmotion", label: "Stop motion", desc: "Plasticine photographiée image par image : barre pêche, feuille de papier, fleurs, feuilles, perles et branche.", swatch: ["#d9a58a", "#3fa84e", "#f3c32c", "#2f86d4", "#e0485e"] },
  { id: "clay", label: "Pâte à modeler", desc: "Beige chaud, plasticine texturée, papier déchiré, fils et perles.", swatch: ["#e8dbc3", "#2f9e5b", "#f2a71f", "#e8621b", "#7b3bc8"] },
  { id: "pastel", label: "Pastel craft (précédent)", desc: "Lavande douce, coutures et boutons cousus.", swatch: ["#f1e8ff", "#9fd4ff", "#ffdf6e", "#ff9d9d", "#8fe8c2"] },
  { id: "glass", label: "Liquid Glass", desc: "Verre dépoli translucide, reflets et reliefs lumineux, façon Apple.", swatch: ["#dfe9ff", "#7fc0ff", "#b49bff", "#ffab7a", "#74e0b6"] },
  { id: "clean", label: "Script Studio — Clean Light", desc: "Clair, sobre et précis : surfaces blanches, texte bleu nuit, bleu réservé aux actions.", swatch: ["#F4F6FA", "#FFFFFF", "#E7F0FF", "#3B82F6", "#17233D"] },
  { id: "gothic", label: "AIRBOX — Frankenweenie", desc: "Gothique artisanal : charbon, métal patiné, parchemin, surpiqûres et vert-de-gris.", swatch: ["#242321", "#777168", "#E7DDC8", "#82927A", "#C99A50"] },
  { id: "adibou", label: "Adibou", desc: "Cabane en bois : mur bleu, cadres orange, parchemin et boutons-bonbons.", swatch: ["#2C45BB", "#E8912F", "#FDF2D0", "#2FB24C", "#FFC21F"] },
];

/* Couleurs des graphiques (attributs SVG : pas de variables CSS possibles) */
export const PALETTES = {
  pastel: { grid: "#e3dbf7", label: "#a49cc8", median: "#b9aee6", medianText: "#8a82b3", line: "#ff8a5b", fillA: "#ff9d6b", fillB: "#ffb3d1", trend: "#8d6bff", sel: "#8d6bff", ok: "#2fbf8f", bad: "#ff6b6b", peak: "#ff7a59", valley: "#6bb6ff" },
  clay: { grid: "rgba(110,78,45,.22)", label: "#a08d76", median: "#b79f82", medianText: "#8a755c", line: "#e8621b", fillA: "#f2a71f", fillB: "#e8621b", trend: "#7b3bc8", sel: "#7b3bc8", ok: "#2f9e5b", bad: "#d94a2a", peak: "#e8621b", valley: "#35a366" },
  stopmotion: { grid: "rgba(60,35,15,.35)", label: "#3d2c1c", median: "#5f452b", medianText: "#3d2c1c", line: "#c9b48a", fillA: "#e9c98a", fillB: "#d9a58a", trend: "#7a42b8", sel: "#7a42b8", ok: "#1d6f2b", bad: "#b3243a", peak: "#d9475e", valley: "#2f86d4" },
  glass: { grid: "rgba(255,255,255,.85)", label: "#6c7fa6", median: "#8aa0cc", medianText: "#5c7099", line: "#3d7cf0", fillA: "#7fb4ff", fillB: "#c8a6ff", trend: "#b06bff", sel: "#2f6df6", ok: "#1fa97a", bad: "#f0555a", peak: "#ff7a59", valley: "#3d9bff" },
  clean: { grid: "#E3E9F2", label: "#66758F", median: "#B9C6DC", medianText: "#66758F", line: "#3B82F6", fillA: "#8DBBFF", fillB: "#E7F0FF", trend: "#7BA7E8", sel: "#2563EB", ok: "#16A477", bad: "#F46B72", peak: "#F46B72", valley: "#3B82F6" },
  gothic: { grid: "rgba(33,31,28,.28)", label: "#4A463F", median: "#8A7F68", medianText: "#4A463F", line: "#8F6420", fillA: "#C99A50", fillB: "#A94D40", trend: "#52664C", sel: "#52664C", ok: "#3F6A3A", bad: "#A94D40", peak: "#A94D40", valley: "#4F6F86" },
  adibou: { grid: "rgba(160,96,20,.3)", label: "#77551F", median: "#C98A2A", medianText: "#77551F", line: "#D42B2B", fillA: "#FFCF5E", fillB: "#FF8A5E", trend: "#6A2BD0", sel: "#2A68DB", ok: "#1F9A3A", bad: "#D42B2B", peak: "#D42B2B", valley: "#2A68DB" },
};

const KEY = "cinedesk.theme", VER = "cinedesk.theme.ver";
/* Stop motion est le thème par défaut : à la première ouverture de cette version, il remplace l'ancien choix. */
const read = () => {
  try {
    if (localStorage.getItem(VER) !== "4") { localStorage.setItem(VER, "4"); localStorage.setItem(KEY, "stopmotion"); return "stopmotion"; }
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
      <filter id="torn" x="-3%" y="-2%" width="106%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="11" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="twig" x="-3%" y="-2%" width="106%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="9" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);
