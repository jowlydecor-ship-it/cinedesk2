import { useRef, useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Wand2, ImagePlus } from "lucide-react";

export const SHOTS = ["TGP", "PG", "PE", "PA", "PM", "PR", "GP", "IP"];
export const MOVES = ["Fixe", "Panoramique", "Travelling avant", "Travelling arrière", "Travelling latéral", "Steadicam", "Caméra épaule", "Grue", "Zoom", "Dolly zoom"];
const FOCALS = [14, 24, 35, 50, 85, 135];
const RATIOS = { "2.39:1": 2.39, "1.85:1": 1.85, "16:9": 16 / 9, "4:3": 4 / 3 };
const sel = "w-full clay-well px-1.5 py-1 text-[11px] text-ink outline-none";

function SketchPad({ ratio, onSave, onClose }) {
  const ref = useRef(null), drawing = useRef(false);
  const W = 720, H = Math.round(W / ratio);
  const pos = e => { const r = ref.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const down = e => { drawing.current = true; const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = e => { if (!drawing.current) return; const ctx = ref.current.getContext("2d"); ctx.lineTo(...pos(e)); ctx.strokeStyle = "#e5e5e5"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke(); };
  const init = el => { if (el && !ref.current) { ref.current = el; const c = el.getContext("2d"); c.fillStyle = "#0b0b0b"; c.fillRect(0, 0, W, H); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="clay-card p-4">
        <canvas ref={init} width={W} height={H} className="max-w-[80vw] cursor-crosshair rounded" onPointerDown={down} onPointerMove={move} onPointerUp={() => (drawing.current = false)} />
        <div className="mt-3 flex justify-end gap-2 text-xs">
          <button onClick={onClose} className="clay-btn px-3 py-1.5">Annuler</button>
          <button onClick={() => onSave(ref.current.toDataURL("image/png"))} className="clay-solid clay-sky px-3 py-1.5">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export default function Storyboard({ scenes, panels, setPanels }) {
  const [ratioKey, setRatioKey] = useState("2.39:1");
  const [sketch, setSketch] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [selected, setSelected] = useState(null);
  const ratio = RATIOS[ratioKey];
  const patch = (id, p) => setPanels(ps => ps.map(x => (x.id === id ? { ...x, ...p } : x)));
  const mk = (sceneId, p = {}) => ({ id: crypto.randomUUID(), sceneId, shot: "PM", move: "Fixe", focal: 35, dur: 3, desc: "", image: null, ...p });

  const generate = () => setPanels(ps => {
    const out = [...ps];
    scenes.filter(s => !ps.some(p => p.sceneId === s.id)).forEach(s => {
      out.push(mk(s.id, { shot: "PG", focal: 24, dur: 4, desc: s.firstAction || s.heading }));
      [...s.chars.keys()].slice(0, 2).forEach(c => out.push(mk(s.id, { shot: "PR", focal: 85, desc: `${c} – réaction / réplique` })));
    });
    return out;
  });

  const readFile = (file, id) => { if (!file?.type.startsWith("image/")) return; const r = new FileReader(); r.onload = () => patch(id, { image: r.result }); r.readAsDataURL(file); };
  useEffect(() => {                                  // ⌘V : colle une image dans le plan sélectionné
    const h = e => {
      const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
      if (f && selected) { e.preventDefault(); readFile(f, selected); }
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  });
  const dropOn = targetId => {
    if (!dragId || dragId === targetId) return;
    setPanels(ps => { const m = ps.find(p => p.id === dragId); const t = ps.find(p => p.id === targetId); const rest = ps.filter(p => p.id !== dragId); rest.splice(rest.findIndex(p => p.id === targetId), 0, { ...m, sceneId: t.sceneId }); return rest; });
    setDragId(null);
  };
  const total = panels.reduce((a, p) => a + (+p.dur || 0), 0);

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3 text-xs">
        <select value={ratioKey} onChange={e => setRatioKey(e.target.value)} className={`${sel} !w-auto`}>{Object.keys(RATIOS).map(r => <option key={r}>{r}</option>)}</select>
        <button onClick={generate} className="flex items-center gap-1.5 clay-solid clay-peach px-3 py-1.5"><Wand2 size={13} />Générer depuis le scénario</button>
        <span className="text-neutral-500">Cliquez un plan puis ⌘V pour coller une image · {panels.length} plans · durée estimée {Math.floor(total / 60)} min {total % 60} s</span>
      </div>
      {scenes.map(s => {
        const ps = panels.filter(p => p.sceneId === s.id);
        return (
          <section key={s.id} className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-ink">{s.id}. {s.heading}</h3>
              <button onClick={() => setPanels(p => [...p, mk(s.id)])} className="rounded p-1 text-neutral-400 hover:clay-btn"><Plus size={14} /></button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
              {ps.map((p, i) => (
                <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragOver={e => e.preventDefault()}
                     onDrop={e => { e.preventDefault(); e.dataTransfer.files?.length ? readFile(e.dataTransfer.files[0], p.id) : dropOn(p.id); }}
                     onClick={() => setSelected(p.id)}
                     className={`clay-card p-2.5 ${selected === p.id ? "ring-4 ring-[#9fd4ff]" : ""}`}>
                  <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-2xl bg-[var(--frame)]" style={{ aspectRatio: ratio }}>
                    {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-1 text-[11px] text-[var(--frame-text)]"><ImagePlus size={13} />Déposer une image</span>}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] text-white">{i + 1}</span>
                    <div className="absolute right-1 top-1 flex gap-1">
                      <button onClick={() => setSketch(p.id)} className="rounded bg-black/60 p-1 text-white"><Pencil size={11} /></button>
                      <button onClick={() => setPanels(x => x.filter(y => y.id !== p.id))} className="rounded bg-black/60 p-1 text-red-300"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-4 gap-1.5">
                    <select value={p.shot} onChange={e => patch(p.id, { shot: e.target.value })} className={sel}>{SHOTS.map(x => <option key={x}>{x}</option>)}</select>
                    <select value={p.move} onChange={e => patch(p.id, { move: e.target.value })} className={`${sel} col-span-2`}>{MOVES.map(x => <option key={x}>{x}</option>)}</select>
                    <select value={p.focal} onChange={e => patch(p.id, { focal: +e.target.value })} className={sel}>{FOCALS.map(x => <option key={x} value={x}>{x} mm</option>)}</select>
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea value={p.desc} rows={2} placeholder="Description du plan…" onChange={e => patch(p.id, { desc: e.target.value })} className="w-full resize-none clay-well p-1.5 text-[12px] text-ink outline-none" />
                    <label className="text-[10px] text-neutral-500">s<input type="number" min="1" value={p.dur} onChange={e => patch(p.id, { dur: e.target.value })} className="block w-10 clay-well px-1 py-1 text-[11px] text-ink outline-none" /></label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {sketch && <SketchPad ratio={ratio} onClose={() => setSketch(null)} onSave={img => { patch(sketch, { image: img }); setSketch(null); }} />}
    </div>
  );
}
