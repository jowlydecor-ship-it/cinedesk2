import test from "node:test";
import assert from "node:assert/strict";
import { classifyRows, textRows, parseText, importDocument } from "../src/lib/importer.js";
import { parseScript, breakdown } from "../src/lib/screenplay.js";
import { analyze } from "../src/lib/doctor.js";
import { syncNotes, generatePanels } from "../src/lib/project.js";

/* Scénario de référence (dialogues assez longs pour être coupés sur plusieurs lignes) */
const REF = [
  ["heading", "INT. APPARTEMENT DE LÉA – NUIT"],
  ["action", "Une lettre jaunie repose sur la table de la cuisine. Léa la déplie lentement, les mains tremblantes, sans quitter la fenêtre des yeux."],
  ["character", "LÉA"], ["dialogue", "Il savait. Depuis le début, il savait tout et il ne m'a jamais rien dit, pas un mot, pas un seul."],
  ["character", "MARC (V.O.)"], ["parenthetical", "(froidement)"], ["dialogue", "Tu n'aurais pas dû ouvrir cette lettre, Léa, ce n'était pas pour toi."],
  ["action", "Léa recule d'un pas. Le téléphone glisse de sa main et s'écrase au sol."],
  ["transition", "COUPE SUR :"],
  ["heading", "EXT. PORT – JOUR"],
  ["action", "Le vent soulève les bâches des conteneurs. Marc attend, adossé à sa voiture, le regard fixé sur l'horizon gris."],
  ["character", "MARC"], ["dialogue", "Je savais que tu viendrais. Tout le monde finit toujours par venir jusqu'ici, tôt ou tard."],
  ["character", "LÉA"], ["dialogue", "Dis-moi la vérité. Maintenant !"],
  ["heading", "INT. BAR – NUIT"],
  ["action", "Marc glisse un revolver sous le comptoir."],
  ["character", "ROUX"], ["dialogue", "Vous avez une minute pour tout m'expliquer, sinon je vous arrête tous les deux sur-le-champ."],
];
const types = l => l.map(x => x.type);

/* mise en forme « copier-coller depuis un PDF » : retours à la ligne, aucune ligne blanche, aucun retrait */
function wrap(s, n) { const out = []; let cur = ""; for (const w of s.split(" ")) { if ((cur + " " + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } if (cur) out.push(cur); return out; }
const WIDTH = { heading: 60, action: 60, character: 60, parenthetical: 20, dialogue: 33, transition: 60 };
const flat = REF.flatMap(([t, s]) => wrap(s, WIDTH[t]));

test("texte collé SANS lignes blanches ni retraits : tout est reconnu", () => {
  const lines = parseText(flat.join("\n"));
  assert.deepEqual(types(lines), types(REF.map(([type, text]) => ({ type, text }))));
  assert.equal(lines[0].text, "INT. APPARTEMENT DE LÉA – NUIT");
  assert.match(lines[3].text, /^Il savait\. Depuis le début.*pas un seul\.$/);   // lignes recollées en une réplique
});

test("texte avec lignes blanches (format Fountain-like)", () => {
  const txt = REF.map(([t, s]) => s).join("\n\n");
  const lines = parseText(txt);
  assert.deepEqual(types(lines), REF.map(r => r[0]));
});

test("numéros de page isolés et marques (SUITE) ignorés", () => {
  const lines = parseText("INT. BAR – NUIT\n\nMARC (SUITE)\nBonjour tout le monde.\n12\nLÉA\nSalut.");
  assert.deepEqual(types(lines), ["heading", "character", "dialogue", "character", "dialogue"]);
  assert.equal(lines[1].text, "MARC");
});

test("en-têtes numérotés et variantes françaises", () => {
  const lines = parseText("12 INT. SALON - JOUR 12\n\nIl entre.\n\nEXTÉRIEUR RUE – NUIT\n\nSCÈNE 14\n\nINT/EXT. VOITURE – JOUR");
  assert.deepEqual(types(lines), ["heading", "action", "heading", "heading", "heading"]);
  assert.equal(lines[0].text, "INT. SALON - JOUR");
});

test("format « NOM : réplique »", () => {
  const lines = parseText("INT. SALON – JOUR\n\nLÉA : Tu es en retard.\nMARC : Je sais.\nLÉA : Encore.");
  assert.deepEqual(types(lines), ["heading", "character", "dialogue", "character", "dialogue", "character", "dialogue"]);
});

test("une phrase d'action en majuscules n'est pas prise pour un personnage", () => {
  const lines = parseText("INT. SALON – JOUR\n\nLA PORTE S'OUVRE EN FRACAS.\n\nLÉA\nQui est là ?");
  assert.deepEqual(types(lines), ["heading", "action", "character", "dialogue"]);
});

/* ───────── PDF réel (pdf-lib pour fabriquer, pdfjs pour lire) ───────── */
let pdfLib, pdfjs;
try { pdfLib = await import("pdf-lib"); pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); } catch { /* modules absents : tests PDF ignorés */ }

async function makePdf({ numbers = true, header = true, title = true } = {}) {
  const { PDFDocument, StandardFonts } = pdfLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const X = { heading: 108, action: 108, character: 266, parenthetical: 223, dialogue: 180, transition: 430 };
  const W = { heading: 60, action: 60, character: 40, parenthetical: 20, dialogue: 33, transition: 20 };
  const rows = [];
  REF.forEach(([t, s], k) => { const gap = t === "heading" ? 2 : t === "action" || t === "character" || t === "transition" ? 1 : 0; wrap(s, W[t]).forEach((l, i) => rows.push({ t, l, gap: i === 0 ? gap : 0 })); });
  if (title) { const p = doc.addPage([612, 792]); p.drawText("LA LETTRE", { x: 250, y: 500, size: 12, font }); p.drawText("écrit par", { x: 260, y: 450, size: 12, font }); p.drawText("Camille Durand", { x: 245, y: 430, size: 12, font }); }
  let page, row = 99, pg = 0;
  const maxRows = 14;                                     // petites pages pour forcer plusieurs sauts de page
  rows.forEach(r => {
    if (row + r.gap >= maxRows) { page = doc.addPage([612, 792]); pg++; row = 0; if (header) page.drawText("LA LETTRE - V3", { x: 108, y: 750, size: 12, font }); if (numbers) page.drawText(`${pg}.`, { x: 520, y: 750, size: 12, font }); r = { ...r, gap: 0 }; }
    row += r.gap;
    const x = r.t === "transition" ? 540 - r.l.length * 7.2 : X[r.t];
    page.drawText(r.l, { x, y: 700 - row * 12, size: 12, font });
    row++;
  });
  return await doc.save();
}

test("PDF avec mise en page, numéros de page, en-têtes répétés et page de titre", { skip: !pdfLib || !pdfjs }, async () => {
  const bytes = await makePdf();
  const r = await importDocument("scenario.pdf", bytes, { pdfjs });
  assert.deepEqual(types(r.lines), REF.map(x => x[0]));
  assert.equal(r.report.scenes, 3);
  assert.equal(r.report.characters, 3);
  assert.equal(r.report.confidence, "élevée");
  assert.equal(r.report.warnings.length, 0);
  assert.equal(r.meta.title, "LA LETTRE");
  assert.equal(r.meta.author, "Camille Durand");
  assert.ok(!r.lines.some(l => /V3|^\d+\.$/.test(l.text)));
});

/* ───────── Word réel (docx pour fabriquer, jszip pour lire) ───────── */
let docxLib, JSZip;
try { docxLib = await import("docx"); JSZip = (await import("jszip")).default; } catch { /* absent */ }

test("Word avec retraits de paragraphes", { skip: !docxLib || !JSZip }, async () => {
  const { Document, Packer, Paragraph, TextRun } = docxLib;
  const LEFT = { heading: 0, action: 0, character: 3800, parenthetical: 3200, dialogue: 2500, transition: 0 };
  const children = REF.map(([t, s]) => new Paragraph({ indent: { left: LEFT[t] }, alignment: t === "transition" ? "right" : "left", children: [new TextRun({ text: s, font: "Courier New" })], spacing: { after: 120 } }));
  const bytes = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  const r = await importDocument("scenario.docx", bytes, { JSZip });
  assert.deepEqual(types(r.lines), REF.map(x => x[0]));
});

test("PDF scanné (sans texte) : avertissement clair", { skip: !pdfLib || !pdfjs }, async () => {
  const doc = await pdfLib.PDFDocument.create(); doc.addPage([612, 792]);
  const r = await importDocument("scan.pdf", await doc.save(), { pdfjs });
  assert.ok(r.report.warnings.some(w => /scan/i.test(w)));
});

test("de bout en bout : PDF → séquencier, storyboard, dépouillement et analyse", { skip: !pdfLib || !pdfjs }, async () => {
  const r = await importDocument("scenario.pdf", await makePdf(), { pdfjs });
  const scenes = parseScript(r.lines);
  assert.equal(scenes.length, 3);
  assert.equal(syncNotes([], scenes).length, 3);                         // un post-it par séquence
  assert.ok(generatePanels(scenes).length >= 3);                         // plans du storyboard
  assert.deepEqual(breakdown(scenes).characters.map(c => c.name).sort(), ["LÉA", "MARC", "ROUX"]);
  const report = analyze(scenes, [], []);
  assert.equal(report.scenes.length, 3);
  assert.ok(report.scenes.every(s => s.summary.length > 10));
});

test("transitions : ENCHAÎNEMENT, INTERCUT, COUPE SUR :, FONDU AU NOIR", () => {
  const lines = parseText("INT. BAR – NUIT\n\nIl boit.\n\nENCHAÎNEMENT SUR :\n\nEXT. RUE – NUIT\n\nIl marche.\n\nINTERCUT\n\nINT. BAR – NUIT\n\nFONDU AU NOIR.");
  assert.deepEqual(types(lines), ["heading", "action", "transition", "heading", "action", "transition", "heading", "transition"]);
});
