/* Parseur de scénario + dépouillement – 100 % local, aucune dépendance */
const SLUG = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?)\s+(.+?)(?:\s+[–—-]\s+([^–—-]+))?$/i;
const SIGNIFICANT = "revolver|pistolet|arme|fusil|couteau|lettre|clé|clef|bague|photo|mallette|valise|carnet|dossier|enveloppe";
const COMMON = "voiture|moto|bateau|téléphone|portable|bouteille|verre|cigarette|ordinateur|sac|carte|journal|collier";
const LEX = new RegExp(`(?<![\\p{L}])(${SIGNIFICANT}|${COMMON})s?(?![\\p{L}])`, "giu");
const CAPS = /(?<![\p{L}])\p{Lu}{3,}(?![\p{L}])/gu;
export const SIGNIFICANT_RE = new RegExp(`^(${SIGNIFICANT})$`, "i");

export const words = s => (s.match(/[\p{L}'’-]+/gu) || []).length;
const speaker = s => s.replace(/\s*\(.*?\)\s*/g, "").trim().toUpperCase();
const stem = s => s.toLowerCase().replace(/s$/, "").replace("clef", "clé");

export function parseScript(lines) {
  const scenes = [];
  let cur = null, who = null;
  const open = (text, start) => {
    const m = text.match(SLUG);
    cur = {
      id: scenes.length + 1, start, heading: text,
      ie: m ? m[1].toUpperCase().replace(/\./g, "") : "",
      location: (m ? m[2] : text).trim().toUpperCase(),
      time: (m?.[3] || "").trim().toUpperCase(),
      chars: new Map(), props: new Set(), propAt: {}, lines: [], end: start,
      dialogueWords: 0, actionWords: 0, turns: 0, firstAction: "",
    };
    scenes.push(cur);
  };
  lines.forEach((l, i) => {
    const t = l.text.trim();
    if (l.type === "heading") { if (t) open(t, i); return; }
    if (!t) return;
    if (!cur) open("(SANS EN-TÊTE)", i);
    cur.lines.push({ ...l, text: t, i });
    cur.end = i;
    if (l.type === "character") {
      who = speaker(t);
      if (!cur.chars.has(who)) cur.chars.set(who, { words: 0, lines: 0 });
      cur.turns++;
    } else if (l.type === "dialogue" && who) {
      const c = cur.chars.get(who) || { words: 0, lines: 0 };
      c.words += words(t); c.lines++;
      cur.chars.set(who, c);
      cur.dialogueWords += words(t);
    } else if (l.type === "action") {
      cur.actionWords += words(t);
      if (!cur.firstAction) cur.firstAction = t;
    }
  });
  const names = new Set(scenes.flatMap(s => [...s.chars.keys()]));
  scenes.forEach(s => {
    s.lines.filter(l => l.type === "action").forEach(l => {
      const note = p => { const k = stem(p); s.props.add(k); (s.propAt[k] = s.propAt[k] || []).push(l.i); };
      (l.text.match(LEX) || []).forEach(note);
      (l.text.match(CAPS) || []).forEach(p => { if (!names.has(p)) note(p); });
    });
    const w = s.dialogueWords + s.actionWords;
    s.eighths = Math.max(1, Math.ceil((w / 200) * 8));   // ≈ 200 mots / page
    s.seconds = Math.round((s.eighths / 8) * 60);         // ≈ 1 page = 1 minute
  });
  return scenes;
}

export function breakdown(scenes) {
  const chars = new Map(), locs = new Map(), props = new Map();
  scenes.forEach(s => {
    s.chars.forEach((v, name) => {
      const c = chars.get(name) || { name, scenes: [], words: 0, lines: 0 };
      c.scenes.push(s.id); c.words += v.words; c.lines += v.lines; chars.set(name, c);
    });
    const l = locs.get(s.location) || { name: s.location, ie: s.ie, scenes: [], times: new Set(), eighths: 0 };
    l.scenes.push(s.id); if (s.time) l.times.add(s.time); l.eighths += s.eighths; locs.set(s.location, l);
    s.props.forEach(p => {
      const x = props.get(p) || { name: p, scenes: [] }; x.scenes.push(s.id); props.set(p, x);
    });
  });
  const totalEighths = scenes.reduce((a, s) => a + s.eighths, 0);
  return {
    characters: [...chars.values()].sort((a, b) => b.scenes.length - a.scenes.length || b.words - a.words),
    locations: [...locs.values()].sort((a, b) => b.scenes.length - a.scenes.length),
    props: [...props.values()].sort((a, b) => b.scenes.length - a.scenes.length),
    pages: +(totalEighths / 8).toFixed(1),
    minutes: Math.round(totalEighths / 8),
  };
}

export const eighths = n => { const p = Math.floor(n / 8), r = n % 8; return `${p ? p + " " : ""}${r ? r + "/8" : ""}`.trim() || "0"; };

/* Ordre de tournage : regroupement par décor, jour avant nuit */
export function shootingOrder(scenes) {
  const dayFirst = t => (/NUIT|SOIR/.test(t) ? 1 : 0);
  return [...scenes].sort((a, b) =>
    a.location.localeCompare(b.location) || dayFirst(a.time) - dayFirst(b.time) || a.id - b.id);
}
