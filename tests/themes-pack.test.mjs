/* Thèmes « clean », « gothic » et « adibou » : jeux de variables complets, palettes de graphiques, fichiers référencés présents,
   contrastes de lecture (WCAG AA = 4,5:1) sur les couples texte/fond réellement utilisés. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = p => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const exists = p => fs.existsSync(new URL(p, import.meta.url));
const IDS = ["clean", "gothic", "adibou"];
const indexCss = read("../src/index.css"), themeSrc = read("../src/theme.jsx"), craft = read("../src/modules/Craft.jsx");
const sheet = id => read(`../src/themes/${id}.css`);
const block = id => sheet(id).split(`html[data-theme="${id}"] {`)[1].split("\n}")[0];

const REQUIRED = ["--color-ink", "--color-ink-soft", "--color-ink-mute", "--color-neutral-100", "--color-neutral-700", "--line", "--soft", "--soft2", "--accent", "--warn", "--frame", "--frame-text",
  "--overlay", "--dots", "--sb", "--stitch-c", "--card-bg", "--card-bgm", "--card-r", "--card-bd", "--bf", "--card-sh", "--chip-bg", "--chip-bgm", "--chip-bd", "--chip-sh",
  "--well-bg", "--well-bgm", "--well-r", "--well-bd", "--well-sh", "--sol-tex", "--sol-bgm", "--sol-r", "--sol-bd", "--sol-ink", "--sol-ts", "--sol-sh", "--btn-c", "--btn-c2", "--btn-ink", "--btn-sh",
  "--act-c", "--act-c2", "--act-sh", "--paper-bg", "--paper-bgm", "--paper-r", "--paper-bd", "--paper-bf", "--paper-sh", "--sky-c", "--sky-c2", "--peach-c", "--peach-c2", "--mint-c", "--mint-c2",
  "--lilac-c", "--lilac-c2", "--butter-c", "--butter-c2", "--coral-c", "--coral-c2", "--pink-c", "--pink-c2", "--nav-r"];

test("les trois thèmes récents sont importés, listés et ont une feuille dédiée", () => {
  for (const id of IDS) {
    assert.ok(indexCss.includes(`@import "./themes/${id}.css"`), `import ${id}`);
    assert.ok(new RegExp(`id: "${id}", label: "[^"]+", desc: "[^"]+", swatch: \\[("#[0-9A-Fa-f]{6}",? ?){5}\\]`).test(themeSrc), `registre ${id}`);
  }
});

test("chaque thème récent définit toutes les variables pilotant les composants", () => {
  for (const id of IDS) for (const v of REQUIRED) assert.ok(new RegExp(`${v}\\s*:`).test(block(id)), `${id} : ${v}`);
});

test("les palettes de graphiques des thèmes récents ont les mêmes clés que les autres", () => {
  const keys = id => [...themeSrc.split(`${id}: {`)[1].split("},")[0].matchAll(/(\w+):/g)].map(m => m[1]).sort().join();
  for (const id of IDS) assert.equal(keys(id), keys("pastel"), id);
});

test("tous les fichiers référencés par les thèmes existent", () => {
  const refs = new Set();
  for (const id of IDS) for (const m of sheet(id).matchAll(/url\("(\/assets\/[^"]+)"\)/g)) refs.add(m[1]);
  for (const m of craft.matchAll(/"(toy-[\w-]+|star)"/g)) refs.add(`/assets/adibou/${m[1]}.png`);
  assert.ok(refs.size >= 7);
  for (const r of refs) assert.ok(exists(`../public${r}`), r);
  const manifest = JSON.parse(read("../public/assets/adibou/manifest.json"));
  for (const a of manifest.assets) assert.ok(exists(`../public/${a.path}`), a.path);
});

/* contrastes */
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const PAIRS = {
  clean: [["#17233D", "#FFFFFF"], ["#52627F", "#FFFFFF"], ["#66758F", "#FFFFFF"], ["#17233D", "#E7F0FF"], ["#0F7F5C", "#FFFFFF"], ["#B45F00", "#FFFFFF"], ["#17233D", "#F4F6FA"]],
  gothic: [["#211F1C", "#B9B1A3"], ["#3F3B34", "#B9B1A3"], ["#5A5549", "#E7DDC8"], ["#211F1C", "#F1E8D7"], ["#F4ECDA", "#4C6046"], ["#F1E8D7", "#34322E"], ["#1E4420", "#BDB5A6"], ["#5E3300", "#BDB5A6"]],
  adibou: [["#33200C", "#F7E3AB"], ["#5E3F18", "#FDF2D0"], ["#77551F", "#FBEDC2"], ["#4A2C0C", "#FFC21F"], ["#17702B", "#F9E8B8"], ["#A24E00", "#F9E8B8"], ["#2A1806", "#D98A38"]],
};
test("contrastes de lecture ≥ 4,5:1 sur les couples texte/fond des thèmes récents", () => {
  for (const [id, pairs] of Object.entries(PAIRS)) for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${id} : ${fg} sur ${bg} = ${ratio(fg, bg).toFixed(2)}`);
});

test("chaque thème respecte prefers-reduced-motion et garde un focus clavier visible", () => {
  for (const id of IDS) {
    assert.ok(sheet(id).includes("prefers-reduced-motion: reduce"), `${id} : animations`);
    assert.ok(sheet(id).includes(`html[data-theme="${id}"] :where(button, a, [tabindex]):focus-visible`), `${id} : focus`);
  }
});

test("aucune dépendance externe : pas d'URL distante dans les feuilles de thème", () => {
  for (const id of IDS) assert.ok(!/https?:\/\//.test(sheet(id)), id);
});
