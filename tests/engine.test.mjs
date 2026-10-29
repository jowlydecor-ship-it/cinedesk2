import test from "node:test";
import assert from "node:assert/strict";
import { sampleScript } from "../src/lib/sample.js";
import { parseScript, breakdown, shootingOrder } from "../src/lib/screenplay.js";
import { analyze } from "../src/lib/doctor.js";
import { toFountain, fromFountain } from "../src/lib/formats.js";
import { syncNotes, parseProject, sampleProject, serialize } from "../src/lib/project.js";

const scenes = parseScript(sampleScript);

test("parseur : scènes, décors et moments", () => {
  assert.equal(scenes.length, 8);
  assert.equal(scenes[0].ie, "INT");
  assert.equal(scenes[0].time, "NUIT");
  assert.equal(scenes[1].location, "RUE");
});

test("dépouillement : personnages et accessoires", () => {
  const B = breakdown(scenes);
  assert.deepEqual(B.characters.map(c => c.name).sort(), ["LÉA", "MARC", "ROUX"]);
  assert.deepEqual(B.props.find(p => p.name === "revolver").scenes, [3, 7, 8]);
});

test("ordre de tournage : regroupé par décor, jour avant nuit", () => {
  const order = shootingOrder(scenes).map(s => s.location);
  assert.deepEqual(order, [...order].sort());
});

test("Script Doctor : détecte l'objet jamais réutilisé", () => {
  const r = analyze(scenes, [], []);
  assert.ok(r.flaws.some(f => /lettre/.test(f.title) && f.severity === "high"));
  assert.ok(r.flaws.every(f => typeof f.fix === "string" && f.fix.length > 10));
  assert.equal(r.scenes.length, scenes.length);
  assert.equal(r.curve.length, scenes.length);
});

test("Script Doctor : déséquilibre des actes", () => {
  const notes = [...Array(8)].map((_, i) => ({ id: i, act: i < 7 ? "Acte II-A" : "Acte I", color: "A", text: "x" }));
  const r = analyze(scenes, notes, ["Acte I", "Acte II-A", "Acte II-B", "Acte III"]);
  assert.ok(r.flaws.some(f => /Acte II-A surdimensionné/.test(f.title)));
});

test("Fountain : aller-retour sans perte de structure", () => {
  const txt = toFountain(sampleScript, { title: "Test", author: "Moi" });
  const { lines, meta } = fromFountain(txt);
  assert.equal(meta.title, "Test");
  assert.deepEqual(lines.map(l => l.type), sampleScript.map(l => l.type));
  assert.equal(lines[0].text, sampleScript[0].text.toUpperCase());
});

test("projet : synchronisation idempotente et sauvegarde/relecture", () => {
  const p = sampleProject();
  assert.equal(p.notes.length, 8);
  assert.equal(p.links.length, 2);
  assert.equal(syncNotes(p.notes, parseScript(p.lines)), p.notes);
  const back = parseProject(serialize(p));
  assert.equal(back.notes.length, 8);
  assert.throws(() => parseProject('{"x":1}'));
});

test("Script Doctor : chaque valeur de tension est justifiée", () => {
  const r = analyze(scenes, [], []);
  r.scenes.forEach(i => { assert.ok(i.value >= 0 && i.value <= 10); assert.match(i.summary, /Tension/); });
  const top = r.scenes[r.climax];
  assert.ok(top.factors.length > 0 && top.summary.includes("principalement due à"));
  assert.ok(r.scenes.some(i => i.role === "pic"));
});

test("Script Doctor : chaque faille est localisée et expliquée", () => {
  const r = analyze(scenes, [], []);
  const f = r.flaws.find(x => /lettre/.test(x.title));
  assert.ok(f.why.length > 30 && f.scenes.length === 1 && f.lines.length >= 1);
  assert.ok(r.flags[f.lines[0]].includes(f));          // marqueur posé sur la bonne ligne du scénario
  r.flaws.forEach(x => { assert.ok(x.why && x.fix && x.text); });
});

test("durée estimée, actes au temps et statistiques de personnages", () => {
  const r = analyze(scenes, [], []);
  assert.ok(r.runtime.total > 0 && r.runtime.low <= r.runtime.total && r.runtime.total <= r.runtime.high);
  assert.equal(r.acts.length, 4);
  assert.ok(Math.abs(r.acts.reduce((a, x) => a + x.minutes, 0) - r.runtime.total) < 0.01);
  const lea = r.characters.find(c => c.name === "LÉA");
  assert.ok(lea.lines >= 5 && lea.share > 40 && lea.cum.at(-1) === lea.words);
  assert.equal(r.scenes[3].minute > r.scenes[2].minute, true);
});

test("grille d'analyse et critères pré-remplis", () => {
  const r = analyze(scenes, [], []);
  const keys = r.grid.map(g => g.key);
  for (const k of ["exposition", "incident", "bascule", "midpoint", "climax", "denouement", "protagoniste", "antagoniste", "preparations", "suspense", "specificites"]) assert.ok(keys.includes(k), k);
  assert.match(r.grid.find(g => g.key === "protagoniste").auto, /LÉA/);
  assert.match(r.grid.find(g => g.key === "preparations").auto, /revolver/);
  assert.deepEqual(r.criteria.map(c => c.key), ["rythme", "enjeux", "arc", "information"]);
  for (const k of ["act_sujet", "act_opposant", "prop_dram", "t1", "t14", "t19", "t22"]) assert.ok(r.grid.some(g => g.key === k), k);
  assert.equal(r.criteria.find(c => c.key === "information").status, "warn");   // « lettre » sans suite
  assert.equal(r.criteria.find(c => c.key === "arc").status, "manual");
});

test("enjeux qui n'escaladent pas : détecté avec justification chiffrée", () => {
  const flat = Array.from({ length: 10 }, (_, k) => [{ type: "heading", text: `INT. LIEU ${k} – JOUR` }, { type: "action", text: "Il attend." }, { type: "character", text: "PAUL" }, { type: "dialogue", text: "Bonjour." }]).flat();
  const r = analyze(parseScript(flat), [], []);
  const f = r.flaws.find(x => x.kind === "stakes" || x.kind === "flat");
  assert.ok(f && /pente|écart-type/.test(f.why));
});

const make = (n, fn) => Array.from({ length: n }, (_, k) => fn(k)).flat();
const sc = (k, head, action, who, line) => [{ type: "heading", text: head }, { type: "action", text: action }, ...(who ? [{ type: "character", text: who }, { type: "dialogue", text: line }] : [])];

test("principes de dramaturgie : opposant absent, hasard, ouverture, alternance jour/nuit", () => {
  const lines = make(12, k => sc(k, `INT. LIEU ${k} – NUIT`, k === 0 ? "Léa entre." : "Léa attend. Heureusement, la porte s'ouvre par hasard.", "LÉA", k < 4 ? "Où est Marc ?" : "Je suis seule."))
    .concat(make(12, k => []));
  // Marc n'apparaît que dans le premier tiers
  [0, 1, 2].forEach(i => lines.splice(lines.findIndex(l => l.text === `INT. LIEU ${i} – NUIT`) + 2, 0, { type: "character", text: "MARC" }, { type: "dialogue", text: "Tu me cherches ? Tu vas me payer ça, je te le promets." }));
  const r = analyze(parseScript(lines), [], []);
  const kinds = r.flaws.map(f => f.kind);
  assert.ok(kinds.includes("luck"), "hasard");
  assert.ok(kinds.includes("daynight"), "alternance jour/nuit");
  assert.ok(kinds.includes("opponent"), "opposant");
  r.flaws.filter(f => ["luck", "daynight", "opponent"].includes(f.kind)).forEach(f => assert.ok(f.why.length > 30 && f.fix.length > 10));
});

test("modèle actantiel et indice d'arc dans la grille", () => {
  const lines = [...sc(0, "INT. BAR – JOUR", "Léa boit.", "LÉA", "Je veux retrouver mon frère."), { type: "character", text: "MARC" }, { type: "dialogue", text: "Laisse tomber." },
    ...sc(1, "INT. RUE – JOUR", "Marc la suit.", "MARC", "Tu ne le trouveras pas."), { type: "character", text: "LÉA" }, { type: "dialogue", text: "Je le trouverai." },
    ...sc(2, "INT. BAR – NUIT", "Ils se battent.", "LÉA", "Non ! Arrête !"), { type: "character", text: "MARC" }, { type: "dialogue", text: "Tais-toi !" },
    ...sc(3, "INT. QUAI – JOUR", "Léa pleure.", "LÉA", "Je comprends enfin, tout ce temps il était là.")];
  const r = analyze(parseScript(lines), [], []);
  assert.match(r.grid.find(g => g.key === "act_objet").auto, /frère/);
  assert.match(r.grid.find(g => g.key === "act_opposant").auto, /MARC/);
  assert.ok(r.revelation && r.revelation.id === 4);
  assert.equal(r.criteria.find(c => c.key === "arc").status, "ok");
});

test("présence des personnages : un personnage qui AGIT sans parler compte comme présent", () => {
  const lines = [
    { type: "heading", text: "INT. SALON – JOUR" }, { type: "action", text: "Léa lit." }, { type: "character", text: "LÉA" }, { type: "dialogue", text: "Bonjour." },
    { type: "heading", text: "EXT. JARDIN – JOUR" }, { type: "action", text: "Léa arrose les fleurs. Marc la regarde, assis sur un banc." },
    { type: "heading", text: "INT. CUISINE – NUIT" }, { type: "action", text: "Seul Marc prépare le dîner en silence." }, { type: "character", text: "MARC" }, { type: "dialogue", text: "Tout est prêt." },
  ];
  const sc = parseScript(lines);
  assert.deepEqual([...sc[1].chars.keys()].sort(), ["LÉA", "MARC"]);          // scène 2 : aucun dialogue, mais Léa et Marc agissent
  assert.equal(sc[1].chars.get("LÉA").lines, 0);
  assert.ok(sc[1].chars.get("MARC").actions >= 1);
  const B = breakdown(sc);
  assert.deepEqual(B.characters.find(c => c.name === "LÉA").scenes, [1, 2]);
  assert.deepEqual(B.characters.find(c => c.name === "MARC").scenes, [2, 3]);
  const r = analyze(sc, [], []);
  const lea = r.characters.find(c => c.name === "LÉA");
  assert.deepEqual(lea.pres, [1, 1, 0]);
  assert.deepEqual(lea.cells, [1, 0, 0]);                                     // 1 mot de dialogue, aucune parole en scène 2
  assert.equal(lea.acts[1], 1);
});

test("présence : noms courts ou communs ignorés, casse et accents tolérés", () => {
  const lines = [{ type: "heading", text: "INT. A – JOUR" }, { type: "character", text: "ÉLISE" }, { type: "dialogue", text: "Oui." },
    { type: "heading", text: "INT. B – JOUR" }, { type: "action", text: "élise entre. Les enfants courent. Tous rient." }];
  const sc = parseScript(lines);
  assert.ok(sc[1].chars.has("ÉLISE"));
  assert.equal(sc[1].chars.size, 1);
});
