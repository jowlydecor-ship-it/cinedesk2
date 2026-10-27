import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { Link2, RefreshCw, Trash2, ArrowUpRight, AlertTriangle } from "lucide-react";
import { ACTS, uid } from "../lib/project";
import { tilt } from "./Craft";
import { COLORS, COLOR_LABEL, curlOf } from "../lib/postit";
export { COLORS, COLOR_LABEL };
import { fmt } from "../lib/doctor";

const LINK_LABELS = ["Fusil de Tchekhov", "Indice", "Écho", "Cause → effet"];

export default function PostItWall({ notes, setNotes, links, setLinks, scenes, filter, setFilter, highlight, onOpenScene, onSync, report }) {
  const [mode, setMode] = useState("manual");
  const [dragId, setDragId] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [from, setFrom] = useState(null);
  const [geo, setGeo] = useState([]);
  const wrap = useRef(null), els = useRef(new Map());
  const sceneOf = n => scenes.find(s => s.heading === n.heading);

  /* ── glisser-déposer ── */
  const drop = (act, beforeId) => {
    if (!dragId) return;
    setNotes(ns => {
      const moved = { ...ns.find(n => n.id === dragId), act };
      const rest = ns.filter(n => n.id !== dragId);
      let idx = beforeId ? rest.findIndex(n => n.id === beforeId) : -1;
      if (idx === -1) idx = rest.map(n => n.act).lastIndexOf(act) + 1;
      rest.splice(idx, 0, moved);
      return rest;
    });
    setDragId(null);
  };
  const upd = (id, p) => setNotes(ns => ns.map(n => (n.id === id ? { ...n, ...p } : n)));
  const remove = id => { setNotes(ns => ns.filter(n => n.id !== id)); setLinks(ls => ls.filter(l => l.from !== id && l.to !== id)); };

  /* ── liens (fusil de Tchekhov) ── */
  const clickNote = id => {
    if (!linkMode) return;
    if (!from) { setFrom(id); return; }
    if (from !== id && !links.some(l => l.from === from && l.to === id))
      setLinks(ls => [...ls, { id: uid(), from, to: id, label: LINK_LABELS[0] }]);
    setFrom(null);
  };
  const measure = () => {
    const c = wrap.current?.getBoundingClientRect(); if (!c) return;
    const pt = id => { const e = els.current.get(id); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left - c.left + r.width / 2, r.top - c.top + r.height / 2]; };
    setGeo(links.map(l => {
      const a = pt(l.from), b = pt(l.to); if (!a || !b) return null;
      const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 - 40 - Math.abs(a[0] - b[0]) * 0.08;
      return { id: l.id, label: l.label, d: `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`, mx: 0.25 * a[0] + 0.5 * cx + 0.25 * b[0], my: 0.25 * a[1] + 0.5 * cy + 0.25 * b[1] };
    }).filter(Boolean));
  };
  useLayoutEffect(measure, [notes, links, filter]);
  useEffect(() => {
    const ro = new ResizeObserver(measure); wrap.current && ro.observe(wrap.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  });
  useEffect(() => { if (highlight) els.current.get(highlight)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [highlight]);

  const orphan = n => n.heading && !sceneOf(n);
  const info = n => { const s = sceneOf(n); return s && report ? report.scenes[s.id - 1] : null; };
  /* couleurs d'après l'analyse : scènes fortes / respirations, présence du protagoniste (méthode des cartes) */
  const shown = n => {
    const inf = info(n);
    if (mode === "tension" && inf) return inf.value >= 7 ? COLORS.B : inf.value >= 4 ? COLORS.A : COLORS.C;
    if (mode === "presence" && inf) return report.characters[0]?.cells[inf.id - 1] > 0 ? COLORS.F : COLORS.D;
    return COLORS[n.color];
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-300">
        <span className="mr-1 text-neutral-500">Filtrer :</span>
        <button onClick={() => setFilter(null)} className={`rounded-full px-3 py-1 ${!filter ? "clay-btn-active" : "clay-chip"}`}>Tout</button>
        {Object.entries(COLORS).map(([k, c]) => (
          <button key={k} onClick={() => setFilter(filter === k ? null : k)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${filter === k ? "clay-btn-active" : "clay-chip"}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{COLOR_LABEL[k]} ({notes.filter(n => n.color === k).length})
          </button>
        ))}
        {report && (
          <span className="ml-3 flex items-center gap-1.5"><span className="text-ink-mute">Couleurs :</span>
            {[["manual", "Manuelles"], ["tension", "Tension"], ["presence", "Présence du héros"]].map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} className={`px-3 py-1 ${mode === k ? "clay-btn-active" : "clay-chip"}`}>{l}</button>
            ))}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={() => { setLinkMode(m => !m); setFrom(null); }} className={`flex items-center gap-1.5 rounded-md px-3 py-1 ${linkMode ? "clay-solid clay-peach" : "clay-btn"}`}>
          <Link2 size={13} />{linkMode ? (from ? "Choisissez le post-it d'arrivée" : "Choisissez le post-it de départ") : "Relier des post-it"}
        </button>
        <button onClick={onSync} className="flex items-center gap-1.5 clay-btn px-3 py-1"><RefreshCw size={13} />Synchroniser avec le scénario</button>
      </div>

      <div ref={wrap} className="relative">
        <div className="grid grid-cols-4 gap-4">
          {ACTS.map(act => (
            <div key={act} onDragOver={e => e.preventDefault()} onDrop={() => drop(act)} className="min-h-[420px] clay-well p-3">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-neutral-400">
                <span>{act} <span className="font-normal text-neutral-600">· {notes.filter(n => n.act === act).length}</span></span>
                <button onClick={() => setNotes(ns => [...ns, { id: uid(), act, color: "A", heading: "", text: "Nouvelle scène" }])} className="rounded px-1.5 text-neutral-500 hover:clay-btn">+</button>
              </div>
              <div className="space-y-3">
                {notes.filter(n => n.act === act).map(n => (
                  <div key={n.id} ref={el => (el ? els.current.set(n.id, el) : els.current.delete(n.id))}
                       draggable={!linkMode} onDragStart={() => setDragId(n.id)} onDragOver={e => e.preventDefault()}
                       onDrop={e => { e.stopPropagation(); drop(act, n.id); }} onClick={() => clickNote(n.id)}
                       className={`postit-shadow relative transition ${linkMode ? "cursor-pointer" : "cursor-grab"} ${filter && filter !== n.color ? "opacity-20" : ""} ${from === n.id || highlight === n.id ? "ring-4 ring-[#ff8a5b]" : ""}`}
                       style={{ transform: `rotate(${tilt(n.id)}deg)` }}>
                    {info(n) && <span className="clay-chip absolute -right-2 -top-3 px-2 py-0.5 text-[10px] font-extrabold text-ink">{fmt(info(n).value)}</span>}
                    <div className={`postit ${curlOf(n.id)} px-3 pb-2 pt-3.5`} style={{ backgroundColor: shown(n) }}>
                    <textarea value={n.text} rows={3} onChange={e => upd(n.id, { text: e.target.value })} className="font-hand w-full resize-none bg-transparent text-[17px] leading-[1.25] text-[#2b2420] outline-none" />
                    <div className="mt-1 flex items-center gap-1">
                      {Object.entries(COLORS).map(([k, c]) => (
                        <button key={k} onClick={e => { e.stopPropagation(); upd(n.id, { color: k }); }} className="h-3 w-3 rounded-full border border-black/30" style={{ background: c }} />
                      ))}
                      <div className="flex-1" />
                      {orphan(n) && <span title="Cette scène n'existe plus dans le scénario" className="text-red-700"><AlertTriangle size={13} /></span>}
                      {sceneOf(n) && <button title="Ouvrir la scène" onClick={e => { e.stopPropagation(); onOpenScene(sceneOf(n).start); }} className="rounded p-0.5 hover:bg-black/10"><ArrowUpRight size={14} /></button>}
                      <button title="Supprimer" onClick={e => { e.stopPropagation(); remove(n.id); }} className="rounded p-0.5 hover:bg-black/10"><Trash2 size={13} /></button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#FF9F0A" /></marker></defs>
          {geo.map(g => (
            <g key={g.id}>
              <path d={g.d} fill="none" stroke="#FF9F0A" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arr)" opacity="0.9" />
              <foreignObject x={g.mx - 80} y={g.my - 12} width="160" height="26" className="pointer-events-auto">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => setLinks(ls => ls.map(l => (l.id === g.id ? { ...l, label: LINK_LABELS[(LINK_LABELS.indexOf(l.label) + 1) % LINK_LABELS.length] } : l)))}
                    className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-orange-300">{g.label}</button>
                  <button onClick={() => setLinks(ls => ls.filter(l => l.id !== g.id))} className="rounded-full bg-black/80 px-1.5 text-[10px] text-neutral-400">×</button>
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
