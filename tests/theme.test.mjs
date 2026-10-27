import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const src = walk(new URL("../src", import.meta.url).pathname).filter(f => /\.(jsx?|css)$/.test(f));
const themeSrc = fs.readFileSync(new URL("../src/theme.jsx", import.meta.url), "utf8");

test("chaque variable CSS utilisée par les écrans est définie par défaut (aucun thème « troué »)", () => {
  const used = new Set();
  src.filter(f => /\.jsx?$/.test(f)).forEach(f => { for (const m of fs.readFileSync(f, "utf8").matchAll(/var\((--[\w-]+)/g)) used.add(m[1]); });
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const missing = [...used].filter(v => !defined.has(v));
  assert.deepEqual(missing, []);
});

test("les trois thèmes déclarent leurs jeux de variables", () => {
  const ids = [...themeSrc.matchAll(/id: "(\w+)", label/g)].map(m => m[1]);
  assert.deepEqual(ids, ["clay", "pastel", "glass"]);
  assert.ok(css.includes('html[data-theme="clay"]') && css.includes('html[data-theme="glass"]'));
  const block = id => css.split(`html[data-theme="${id}"] {`)[1]?.split("\n}")[0] || "";
  for (const id of ["clay", "glass"]) for (const v of ["--card-bg", "--chip-bg", "--well-bg", "--sol-sh", "--paper-bg", "--sky-c", "--lilac-c", "--color-ink", "--line", "--accent"])
    assert.ok(block(id).includes(v + ":"), `${id} : ${v}`);
});

test("les palettes de graphiques ont les mêmes clés dans chaque thème", () => {
  const keys = id => [...themeSrc.split(`${id}: {`)[1].split("},")[0].matchAll(/(\w+):/g)].map(m => m[1]).sort().join();
  assert.equal(keys("pastel"), keys("clay"));
  assert.equal(keys("pastel"), keys("glass"));
});

test("les couleurs de post-it reprennent le bloc de référence (6 couleurs)", async () => {
  const { COLORS, curlOf } = await import("../src/lib/postit.js");
  assert.equal(Object.keys(COLORS).length, 6);
  assert.ok(["", "postit-br", "postit-bl"].includes(curlOf("abc")));
  assert.equal(curlOf("abc"), curlOf("abc"));
});
