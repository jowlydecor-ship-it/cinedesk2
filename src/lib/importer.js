/* Import intelligent : PDF, Word (.docx), FDX, Fountain, texte brut/collé.
   Reconnaît en-têtes de séquence, personnages, dialogues, parenthèses, transitions et actions,
   à partir de la mise en page (retraits) quand elle existe, sinon à partir du texte seul. */
import { fromFdx, fromFountain } from "./formats.js";

/* ───────────── briques de reconnaissance ───────────── */
const caps = t => { const l = t.replace(/[^\p{L}]/gu, ""); return l.length >= 2 && l === l.toUpperCase(); };
const wc = t => (t.match(/[\p{L}\p{N}'’]+/gu) || []).length;
const CONTD = /\s*\((?:CONT['’]?D\.?|CONT\.?|SUITE|CONTINUED|CONTINUE|CONTINUE?)\)\s*$/i;
const HEAD = new RegExp(
  "^(?:\\d{1,3}[A-Z]?[.)\\s-]+)?(?:(?:INT[ÉE]RIEUR|EXT[ÉE]RIEUR|INT\\.?\\s*/\\s*EXT\\.?|EXT\\.?\\s*/\\s*INT\\.?|INT\\.?|EXT\\.?|I/E\\.?)(?=[\\s.\\-–—])|(?:S[ÉE]QUENCE|SC[ÈE]NE)\\s*\\d+)", "iu");
const TRANS = /^(?:FONDU(?:\s+(?:AU|EN)\s+(?:NOIR|BLANC))?|FONDU\s+ENCHA[IÎ]N[ÉE]|COUPE(?:\s+BRUTALE)?(?:\s+SUR.*)?|ENCHA[IÎ]N[ÉE].*|CUT TO|SMASH CUT TO|MATCH CUT TO|DISSOLVE TO|FADE (?:IN|OUT|TO)|FIN)\s*[:.]?$/i;
const isHead = t => HEAD.test(t);
const isTrans = t => caps(t) && wc(t) <= 6 && (TRANS.test(t.trim()) || /\bTO:$/.test(t.trim()));
const isParen = t => /^\(.+\)$/.test(t) && t.length <= 90;
const key = t => t.replace(CONTD, "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
const TIME = /\b(JOUR|NUIT|SOIR|MATIN|AUBE|CR[ÉE]PUSCULE|DAY|NIGHT|MORNING|EVENING)\b/i;

const cleanHeading = t => {
  let h = t.replace(/^\d{1,3}[A-Z]?[.)\s-]+(?=\p{L})/u, "");
  if (TIME.test(h)) h = h.replace(/(\b(?:JOUR|NUIT|SOIR|MATIN|AUBE|CR[ÉE]PUSCULE|DAY|NIGHT|MORNING|EVENING)\b)\s+\d{1,3}[A-Z]?$/i, "$1");
  return h.trim().toUpperCase();
};

/* « NOM : réplique » (format théâtre / certains scénarios français) */
const INLINE = /^(\p{Lu}[\p{Lu}0-9'’ .-]{1,24}?)\s*:\s+(\S.*)$/u;
function splitInline(rows) {
  const hit = r => { const m = r.text.match(INLINE); return m && caps(m[1]) && wc(m[1]) <= 3 ? m : null; };
  if (rows.filter(hit).length < 3) return rows;
  return rows.flatMap(r => {
    const m = hit(r);
    return m ? [{ text: m[1].trim(), blank: true, forced: "character" }, { text: m[2], blank: false, forced: "dialogue" }] : [r];
  });
}

/* ───────────── analyse de la mise en page (retraits en points) ───────────── */
function analyseLayout(rows) {
  const xr = rows.filter(r => r.x != null);
  if (xr.length < 8) return null;
  const bin = x => Math.round(x / 6) * 6;
  const mode = a => { const m = new Map(); a.forEach(v => m.set(bin(v), (m.get(bin(v)) || 0) + 1)); return [...m].sort((p, q) => q[1] - p[1])[0]?.[0]; };
  const heads = xr.filter(r => isHead(r.text));
  const left = heads.length ? mode(heads.map(r => r.x)) : mode(xr.map(r => r.x));
  const ind = xr.filter(r => !isHead(r.text)).map(r => ({ r, d: r.x - left })).filter(o => o.d > 14).sort((a, b) => a.d - b.d);
  const cl = [];
  ind.forEach(o => { const c = cl.at(-1); if (c && o.d - c.max <= 8) { c.items.push(o); c.max = o.d; } else cl.push({ items: [o], min: o.d, max: o.d }); });
  cl.forEach(c => { c.n = c.items.length; c.caps = c.items.filter(o => caps(o.r.text)).length / c.n; });
  const charC = cl.filter(c => c.n >= 2 && c.caps >= 0.6).sort((a, b) => b.n - a.n || b.min - a.min)[0] || null;
  return { left, charC };
}

/* ───────────── classification ───────────── */
export function classifyRows(rowsIn) {
  let rows = rowsIn.map(r => ({ ...r, text: r.text.replace(/\s+/g, " ").trim() })).filter(r => r.text);
  const L = analyseLayout(rows);
  const layout = !!(L && L.charC);
  if (!layout) rows = splitInline(rows);

  const cand = r => {
    if (r.forced) return r.forced === "character";
    const k = key(r.text);
    return caps(r.text) && k.length > 0 && k.length <= 30 && wc(k) <= 4 && !/[.!?…:,;]$/.test(k) && !isHead(r.text) && !isTrans(r.text);
  };
  const count = new Map();
  rows.forEach((r, i) => { const n = rows[i + 1]; if (cand(r) && n && !isHead(n.text) && !isTrans(n.text)) count.set(key(r.text), (count.get(key(r.text)) || 0) + 1); });
  const isChar = (i, prev) => {
    const r = rows[i]; if (!cand(r)) return false;
    if (r.forced) return true;
    const n = rows[i + 1]; if (!n || isHead(n.text) || isTrans(n.text)) return false;
    if ((count.get(key(r.text)) || 0) >= 2 || /\(.+\)\s*$/.test(r.text) || !!r.blank || prev === "heading" || prev === "transition" || i === 0) return true;
    // nom court (≤ 3 mots) isolé, suivi d'une ligne en casse normale, après une phrase terminée
    return wc(key(r.text)) <= 3 && !caps(n.text) && /[.!?…»”"]$/.test(rows[i - 1].text);
  };
  const inChar = r => r.x != null && layout && r.x - L.left >= L.charC.min - 8 && r.x - L.left <= L.charC.max + 8;

  let dlgMax = 40;
  if (!layout) {
    const lens = [];
    rows.forEach((r, i) => { if (isChar(i, null) && rows[i + 1] && !isParen(rows[i + 1].text)) lens.push(rows[i + 1].text.length); });
    if (lens.length >= 3) { lens.sort((a, b) => a - b); dlgMax = Math.min(70, Math.max(28, lens[Math.floor(lens.length * 0.9)])); }
  }

  const types = [];
  let speaker = false, prevLen = 0;
  rows.forEach((r, i) => {
    const prev = types[i - 1];
    let t;
    if (r.hint || r.forced) t = r.hint || r.forced;
    else if (isHead(r.text)) t = "heading";
    else if (isTrans(r.text)) t = "transition";
    else if (layout) {
      const d = r.x == null ? 0 : r.x - L.left;
      if (inChar(r) && caps(r.text) && wc(r.text) <= 6) t = "character";
      else if (d > 14) t = isParen(r.text) ? "parenthetical" : "dialogue";
      else t = "action";
    }
    else if (isChar(i, prev)) t = "character";
    else if (speaker && isParen(r.text)) t = "parenthetical";
    else if (speaker && (prev === "character" || prev === "parenthetical")) t = "dialogue";
    else if (speaker && prev === "dialogue" && !r.blank && prevLen >= dlgMax * 0.65 && r.text.length <= dlgMax * 1.25) t = "dialogue";
    else t = "action";
    types.push(t);
    speaker = t === "character" || t === "parenthetical" || t === "dialogue";
    if (t === "dialogue") prevLen = r.text.length;
  });

  const out = [];
  rows.forEach((r, i) => {
    const type = types[i];
    let text = r.text;
    if (type === "character") text = text.replace(CONTD, "").toUpperCase();
    if (type === "heading") text = cleanHeading(text);
    const last = out.at(-1);
    if (last && last.type === type && (type === "action" || type === "dialogue") && !r.blank) last.text += " " + text;
    else out.push({ type, text });
  });
  return { lines: out.length ? out : [{ type: "action", text: "" }], layout };
}

/* ───────────── extraction : texte brut ───────────── */
export function decodeText(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(u8).replace(/^\uFEFF/, ""); }
  catch { return new TextDecoder("windows-1252").decode(u8); }
}
export function textRows(text) {
  const rows = []; let blank = true;
  text.replace(/\r/g, "").replace(/\f/g, "\n\n").split("\n").forEach(l => {
    const t = l.trim();
    if (!t) { blank = true; return; }
    if (/^\d{1,3}\.?$/.test(t)) return;                      // numéro de page isolé
    rows.push({ text: t, blank }); blank = false;
  });
  return rows;
}
export const parseText = text => classifyRows(textRows(text)).lines;   // utilisé aussi pour le collage

/* ───────────── extraction : PDF ───────────── */
export async function loadPdfjs() {
  const [lib, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
}
const NUM = /^\d{1,3}[A-Z]?\.?$/;
function itemsToRows(items, pageW) {
  const its = items.filter(i => typeof i.str === "string" && i.str.length)
    .map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, h: i.height || 10 }));
  its.sort((a, b) => b.y - a.y || a.x - b.x);
  const groups = [];
  its.forEach(it => { const g = groups.at(-1); if (g && Math.abs(g.y - it.y) <= 2.5) g.items.push(it); else groups.push({ y: it.y, items: [it] }); });
  return groups.map(g => {
    let a = g.items.sort((p, q) => p.x - q.x).filter(i => i.s.trim() !== "" || a_keep(i));
    if (a.length > 1 && NUM.test(a[0].s.trim()) && a[1].x - (a[0].x + a[0].w) > 14) a = a.slice(1);            // n° de scène en marge gauche
    if (a.length > 1 && NUM.test(a.at(-1).s.trim()) && a.at(-1).x > pageW * 0.8 && a.at(-1).x - (a.at(-2).x + a.at(-2).w) > 14) a = a.slice(0, -1); // … ou droite
    let text = "", end = null;
    a.forEach(it => { if (end != null && it.x - end > it.h * 0.18 && !text.endsWith(" ") && !it.s.startsWith(" ")) text += " "; text += it.s; end = it.x + it.w; });
    return { text: text.trim(), x: a[0]?.x ?? 0, y: g.y, w: (a.at(-1)?.x ?? 0) + (a.at(-1)?.w ?? 0) - (a[0]?.x ?? 0) };
  }).filter(r => r.text);
}
const a_keep = () => true;
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export async function pdfRows(bytes, pdfjs) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push({ h: vp.height, w: vp.width, rows: itemsToRows(tc.items, vp.width) });
  }
  const totalChars = pages.reduce((a, p) => a + p.rows.reduce((b, r) => b + r.text.length, 0), 0);

  /* en-têtes / pieds de page : numéros et textes répétés */
  const zone = (pg, r) => r.y > pg.h * 0.91 || r.y < pg.h * 0.09;
  const repeat = new Map();
  pages.forEach(pg => { new Set(pg.rows.filter(r => zone(pg, r)).map(r => r.text.replace(/\d+/g, "#"))).forEach(k => repeat.set(k, (repeat.get(k) || 0) + 1)); });
  pages.forEach(pg => {
    pg.rows = pg.rows.filter(r => !(zone(pg, r) && (/^\W*\d{1,3}\W*$/.test(r.text) || /^\(?(?:CONTINUED|SUITE|CONTINUE)\)?:?$/i.test(r.text) ||
      (pages.length >= 3 && repeat.get(r.text.replace(/\d+/g, "#")) >= pages.length * 0.5))));
  });

  /* page de titre */
  const meta = {};
  if (pages.length >= 2 && !pages[0].rows.some(r => isHead(r.text)) && pages[0].rows.length <= 20 && pages.slice(1).some(pg => pg.rows.some(r => isHead(r.text)))) {
    const t = pages.shift().rows.map(r => r.text);
    meta.title = t[0];
    const i = t.findIndex(x => /^(?:écrit par|un film de|written by|by|de|scénario de)\b/i.test(x));
    if (i >= 0) meta.author = (t[i + 1] || t[i].replace(/^\S+(?:\s+\S+)?\s+/, "")).trim();
  }

  /* sauts de ligne verticaux → lignes blanches */
  const rows = [];
  pages.forEach(pg => {
    const dy = pg.rows.slice(1).map((r, i) => pg.rows[i].y - r.y).filter(d => d > 0 && d < 40);
    const typical = median(dy) || 12;
    pg.rows.forEach((r, i) => rows.push({ text: r.text, x: r.x, blank: i > 0 && pg.rows[i - 1].y - r.y > typical * 1.6 }));
  });
  return { rows, pages: doc.numPages, meta, scanned: totalChars < 80 };
}

/* ───────────── extraction : Word (.docx), sans DOMParser ───────────── */
const STYLE_HINT = [[/sc[eè]ne|slug|s[eé]quence/i, "heading"], [/character|personnage/i, "character"], [/paren/i, "parenthetical"],
  [/dialog/i, "dialogue"], [/transition/i, "transition"], [/^action$|general|description/i, "action"]];
const unxml = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
export async function docxRows(bytes, JSZip) {
  const zip = await JSZip.loadAsync(bytes);
  const f = zip.file("word/document.xml");
  if (!f) throw new Error("Document Word illisible.");
  const xml = await f.async("string");
  const rows = []; let blank = true;
  for (const m of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    const parts = [""];
    for (const t of p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*>/g)) {
      if (t[0].startsWith("<w:t>") || t[0].startsWith("<w:t ")) parts[parts.length - 1] += unxml(t[1]);
      else if (t[0].startsWith("<w:tab")) parts[parts.length - 1] += " ";
      else parts.push("");
    }
    const ppr = (p.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/) || [, ""])[1];
    const ind = (ppr.match(/<w:ind\b[^>]*>/) || [""])[0];
    const left = +((ind.match(/w:(?:left|start)="(-?\d+)"/) || [, 0])[1]);
    const jc = (ppr.match(/<w:jc\s+w:val="(\w+)"/) || [])[1];
    const style = (ppr.match(/<w:pStyle\s+w:val="([^"]*)"/) || [, ""])[1];
    const hint = STYLE_HINT.find(([re]) => re.test(style))?.[1];
    const x = jc === "center" ? 200 : jc === "right" ? 400 : left / 20;
    parts.forEach(t => { if (!t.trim()) { blank = true; return; } rows.push({ text: t, x, hint, blank }); blank = false; });
  }
  return rows;
}

/* ───────────── rapport de qualité ───────────── */
export function buildReport(lines, extra = {}) {
  const count = t => lines.filter(l => l.type === t).length;
  const chars = new Set(lines.filter(l => l.type === "character").map(l => key(l.text)));
  const scenes = count("heading"), dialogues = count("dialogue");
  const warnings = [...(extra.warnings || [])];
  if (!scenes) warnings.push("Aucun en-tête de séquence (INT./EXT.) reconnu : le séquencier sera vide. Vérifiez le format du document.");
  if (scenes && !chars.size) warnings.push("Aucun personnage reconnu : les noms doivent être en MAJUSCULES au-dessus des répliques.");
  if (extra.scanned) warnings.push("Ce PDF semble être un scan (image) : aucun texte lisible. Exportez un PDF « texte » depuis votre logiciel d'écriture.");
  if (extra.kind === "PDF" && extra.layout === false && chars.size) warnings.push("Mise en page non exploitable : reconnaissance faite à partir du texte seul (moins fiable).");
  const long = lines.filter(l => l.type === "action" && l.text.length > 700).length;
  if (long) warnings.push(`${long} bloc(s) d'action très long(s) : un dialogue a pu être absorbé. Vérifiez dans l'éditeur (⌘1–6 pour corriger un élément).`);
  const level = !scenes ? "faible" : (!chars.size || long > 2 || extra.layout === false) ? "moyenne" : "élevée";
  return { kind: extra.kind || "Texte", pages: extra.pages || null, scenes, characters: chars.size, dialogues,
    counts: Object.fromEntries(["heading", "action", "character", "parenthetical", "dialogue", "transition"].map(t => [t, count(t)])), warnings, confidence: level };
}

/* ───────────── point d'entrée ───────────── */
export async function importDocument(name, bytes, loaders = {}) {
  const ext = name.split(".").pop().toLowerCase();
  let lines, meta = {}, extra = { kind: ext.toUpperCase() };
  if (ext === "pdf") {
    const pdfjs = loaders.pdfjs || await loadPdfjs();
    const r = await pdfRows(bytes, pdfjs);
    const c = classifyRows(r.rows);
    lines = c.lines; meta = r.meta; extra = { ...extra, kind: "PDF", pages: r.pages, layout: c.layout, scanned: r.scanned };
  } else if (ext === "docx") {
    const JSZip = loaders.JSZip || (await import("jszip")).default;
    const c = classifyRows(await docxRows(bytes, JSZip));
    lines = c.lines; extra = { ...extra, kind: "Word", layout: c.layout };
  } else if (ext === "fdx") {
    ({ lines, meta } = fromFdx(decodeText(bytes))); extra.kind = "Final Draft";
  } else {
    const txt = decodeText(bytes);
    const f = ext === "fountain" ? fromFountain(txt) : null;
    if (f && f.lines.some(l => l.type === "heading")) { lines = f.lines; meta = f.meta; extra.kind = "Fountain"; }
    else { const c = classifyRows(textRows(txt)); lines = c.lines; extra.kind = "Texte"; }
  }
  return { lines, meta, report: buildReport(lines, extra) };
}
