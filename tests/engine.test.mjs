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
