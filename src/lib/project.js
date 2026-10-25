import { sampleScript } from "./sample.js";
import { parseScript } from "./screenplay.js";

export const ACTS = ["Acte I", "Acte II-A", "Acte II-B", "Acte III"];
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export const newProject = () => ({
  version: 1, meta: { title: "Sans titre", author: "", contact: "" },
  lines: [{ type: "heading", text: "" }], notes: [], links: [], panels: [], desk: [], gridNotes: {},
});

/* Ajoute au mur un post-it pour chaque scène qui n'en a pas encore (clé = en-tête de scène) */
export function syncNotes(notes, scenes) {
  const known = new Set(notes.map(n => n.heading).filter(Boolean));
  const added = scenes.filter(s => s.heading && !known.has(s.heading)).map(s => ({
    id: uid(), act: ACTS[Math.min(ACTS.length - 1, Math.floor(((s.id - 1) / Math.max(1, scenes.length)) * ACTS.length))],
    color: "A", heading: s.heading, text: s.heading + (s.firstAction ? "\n" + s.firstAction.slice(0, 90) : ""),
  }));
  return added.length ? [...notes, ...added] : notes;
}

export function sampleProject() {
  const lines = sampleScript.map(l => ({ ...l }));
  const notes = syncNotes([], parseScript(lines));
  const by = h => notes.find(n => n.heading.startsWith(h));
  const rev = [by("INT. BAR"), by("EXT. FORÊT"), by("INT. PHARE")];
  const links = rev.every(Boolean) ? [
    { id: uid(), from: rev[0].id, to: rev[1].id, label: "Fusil de Tchekhov" },
    { id: uid(), from: rev[1].id, to: rev[2].id, label: "Fusil de Tchekhov" },
  ] : [];
  return { ...newProject(), meta: { title: "Exemple – La Lettre", author: "", contact: "" }, lines, notes, links };
}

export const serialize = p => JSON.stringify({ app: "CinéDesk", savedAt: new Date().toISOString(), ...p });

export function parseProject(text) {
  const d = JSON.parse(text);
  if (!Array.isArray(d.lines)) throw new Error("Ce fichier n'est pas un projet CinéDesk.");
  const base = newProject();
  return {
    ...base, ...d, meta: { ...base.meta, ...(d.meta || {}) },
    lines: d.lines.length ? d.lines : base.lines,
    notes: d.notes || [], links: d.links || [], panels: d.panels || [], desk: d.desk || [], gridNotes: d.gridNotes || {},
  };
}

/* Un plan d'ensemble par scène + un gros plan pour les deux premiers personnages */
export function generatePanels(scenes, existing = []) {
  const mk = (sceneId, p) => ({ id: uid(), sceneId, shot: "PM", move: "Fixe", focal: 35, dur: 3, desc: "", image: null, ...p });
  const out = [...existing];
  scenes.filter(s => !existing.some(p => p.sceneId === s.id)).forEach(s => {
    out.push(mk(s.id, { shot: "PG", focal: 24, dur: 4, desc: s.firstAction || s.heading }));
    [...s.chars.keys()].slice(0, 2).forEach(c => out.push(mk(s.id, { shot: "PR", focal: 85, desc: `${c} – réaction / réplique` })));
  });
  return out;
}
