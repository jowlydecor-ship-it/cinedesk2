import { useEffect, useRef, useState } from "react";
import { StickyNote, Type, Link2, X, ExternalLink, ImagePlus, Download } from "lucide-react";
import { uid } from "../lib/project";

const SITES = [
  ["Film Grab", "https://film-grab.com", "clay-sky"], ["Eye Candy", "https://eyecannndy.com", "clay-pink"],
  ["Pinterest", "https://www.pinterest.com", "clay-coral"], ["ShotDeck", "https://shotdeck.com", "clay-mint"],
  ["The Script Lab", "https://thescriptlab.com", "clay-butter"], ["CNC", "https://www.cnc.fr", "clay-lilac"],
];
const TAGS = ["Lumière", "Décor", "Costume", "Cadrage", "Couleur", "Ambiance"];
const NOTE_COLORS = ["#FFE27A", "#FFB38A", "#9FD8FF", "#C9B3FF", "#9BE8C3", "#FF9FB8"];
const IMG = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;

/* Les sites s'ouvrent dans VOTRE navigateur (avec vos bloqueurs de pub), pas dans l'application. */
async function openExternal(url) {
  try { const { openUrl } = await import("@tauri-apps/plugin-opener"); await openUrl(url); }
  catch { window.open(url, "_blank"); }
}

/* Réduit l'image (max 1100 px, JPEG) pour garder des projets légers. */
async function shrink(blob, max = 1100) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.86);
  } finally { URL.revokeObjectURL(url); }
}

export default function Desk({ items, setItems, notes }) {
  const scroller = useRef(null), canvas = useRef(null), drag = useRef(null), rs = useRef(null);
  const [filter, setFilter] = useState(null);
  const [busy, setBusy] = useState(false);

  const spot = () => ({ x: (scroller.current?.scrollLeft || 0) + 60 + Math.random() * 140, y: (scroller.current?.scrollTop || 0) + 60 + Math.random() * 100 });
  const upd = (id, p) => setItems(a => a.map(i => (i.id === id ? { ...i, ...p } : i)));
  const add = (it, at) => setItems(a => [...a, { id: uid(), z: a.reduce((m, i) => Math.max(m, i.z || 0), 0) + 1, ...(at || spot()), ...it }]);
  const front = id => setItems(a => { const z = a.reduce((m, i) => Math.max(m, i.z || 0), 0) + 1; return a.find(i => i.id === id)?.z === z - 1 ? a : a.map(i => (i.id === id ? { ...i, z } : i)); });

  const addImageBlob = async (blob, at) => { setBusy(true); try { add({ kind: "image", src: await shrink(blob), w: 260, tag: "", caption: "" }, at); } catch { /* image illisible */ } setBusy(false); };
  const addFromUrl = async (url, at) => {
    if (IMG.test(url)) {
      try { const r = await fetch(url); await addImageBlob(await r.blob(), at); return; }
      catch { add({ kind: "image", src: url, w: 260, tag: "", caption: "" }, at); return; }   // repli : image distante (nécessite Internet)
    }
    let host = url; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignoré */ }
    add({ kind: "link", url, title: host, w: 240, tag: "" }, at);
  };

  const onDrop = async e => {
    e.preventDefault();
    const r = canvas.current.getBoundingClientRect();
    const at = { x: Math.max(0, e.clientX - r.left - 60), y: Math.max(0, e.clientY - r.top - 40) };
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
    if (files.length) { for (const [k, f] of files.entries()) await addImageBlob(f, { x: at.x + k * 26, y: at.y + k * 26 }); return; }
    const html = e.dataTransfer.getData("text/html");
    const url = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || e.dataTransfer.getData("text/uri-list").split("\n")[0] || e.dataTransfer.getData("text/plain");
    if (/^https?:\/\//i.test(url || "")) addFromUrl(url.trim(), at);
    else if (url?.startsWith("data:image")) add({ kind: "image", src: url, w: 260, tag: "", caption: "" }, at);
  };

  useEffect(() => {                                        // ⌘V : image ou adresse
    const h = async e => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); await addImageBlob(f); return; }
      const t = e.clipboardData?.getData("text")?.trim();
      if (t && /^https?:\/\/\S+$/i.test(t)) { e.preventDefault(); addFromUrl(t); }
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  });

  /* déplacement / redimensionnement */
  const down = (e, it) => {
    if (e.target.closest("textarea,input,select,button,a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y };
    front(it.id);
  };
  const move = e => { const d = drag.current; if (d) upd(d.id, { x: Math.max(0, d.ox + e.clientX - d.sx), y: Math.max(0, d.oy + e.clientY - d.sy) }); };
  const rdown = (e, it) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); rs.current = { id: it.id, sx: e.clientX, ow: it.w }; };
  const rmove = e => { const r = rs.current; if (r) upd(r.id, { w: Math.max(130, r.ow + e.clientX - r.sx) }); };

  const importScenes = () => {
    const have = new Set(items.filter(i => i.ref).map(i => i.ref));
    const fresh = notes.filter(n => !have.has(n.id));
    fresh.forEach((n, k) => add({ kind: "note", text: n.text, color: n.color === "A" ? "#FFE27A" : n.color === "B" ? "#FFB38A" : n.color === "C" ? "#9FD8FF" : "#C9B3FF", w: 200, ref: n.id, tag: "" }, { x: 40 + (k % 5) * 220, y: 40 + Math.floor(k / 5) * 150 }));
  };
  const tags = [...new Set(items.map(i => i.tag).filter(Boolean))];

  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="clay-card flex flex-wrap items-center gap-2 p-3 text-xs">
        <span className="mr-1 font-extrabold text-ink">Chercher des références</span>
        {SITES.map(([n, u, c]) => <button key={n} onClick={() => openExternal(u)} className={`clay-solid ${c} flex items-center gap-1 px-3 py-1.5`}>{n}<ExternalLink size={11} /></button>)}
        <span className="mx-1 h-5 w-px bg-[#d9cff7]" />
        <button onClick={() => add({ kind: "note", text: "", color: NOTE_COLORS[0], w: 190, tag: "" })} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><StickyNote size={13} />Post-it</button>
        <button onClick={() => add({ kind: "text", text: "Titre", w: 220, tag: "" })} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><Type size={13} />Texte</button>
        <button onClick={importScenes} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><Download size={13} />Ajouter les scènes du séquencier</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-ink-soft">
        <ImagePlus size={13} /> Glissez des images ou des liens ici, ou copiez-les (clic droit → Copier l'image) puis ⌘V. {busy && <b>Import…</b>}
        {tags.length > 0 && <span className="ml-3 font-bold text-ink">Filtrer :</span>}
        {tags.map(t => <button key={t} onClick={() => setFilter(filter === t ? null : t)} className={`px-2.5 py-0.5 font-semibold ${filter === t ? "clay-solid clay-peach" : "clay-chip"}`}>{t}</button>)}
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-auto clay-well">
        <div ref={canvas} onDragOver={e => e.preventDefault()} onDrop={onDrop} className="relative"
             style={{ width: 3200, height: 2200, backgroundImage: "radial-gradient(#d3c8f3 1.6px, transparent 1.6px)", backgroundSize: "28px 28px" }}>
          {items.map(it => (
            <div key={it.id} onPointerDown={e => down(e, it)} onPointerMove={move} onPointerUp={() => (drag.current = null)}
                 style={{ left: it.x, top: it.y, width: it.w, zIndex: it.z || 1, touchAction: "none" }}
                 className={`group absolute cursor-grab active:cursor-grabbing ${filter && it.tag !== filter ? "opacity-25" : ""}`}>
              {it.kind === "image" && (
                <div className="clay-card p-2">
                  <img src={it.src} alt="" draggable={false} onDragStart={e => e.preventDefault()} className="w-full rounded-2xl" />
                  <input value={it.caption || ""} onChange={e => upd(it.id, { caption: e.target.value })} placeholder="Légende…" className="mt-1.5 w-full bg-transparent px-1 text-xs text-ink outline-none placeholder:text-ink-mute" />
                  <select value={it.tag || ""} onChange={e => upd(it.id, { tag: e.target.value })} className="clay-chip mt-1 px-2 py-0.5 text-[10px] font-semibold text-ink-soft outline-none">
                    <option value="">Sans étiquette</option>{TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {it.kind === "note" && (
                <div className="clay-note p-3" style={{ background: it.color }}>
                  <textarea value={it.text} rows={3} onChange={e => upd(it.id, { text: e.target.value })} placeholder="Idée, scène, intention…" className="w-full resize-none bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:text-[#2f2a5566]" />
                  <div className="mt-1 flex gap-1">{NOTE_COLORS.map(c => <button key={c} onClick={() => upd(it.id, { color: c })} className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: c }} />)}</div>
                </div>
              )}
              {it.kind === "text" && <div className="clay-card px-4 py-3"><textarea value={it.text} rows={1} onChange={e => upd(it.id, { text: e.target.value })} className="w-full resize-none bg-transparent text-lg font-extrabold text-ink outline-none" /></div>}
              {it.kind === "link" && (
                <div className="clay-card p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-ink-soft"><Link2 size={12} />Lien</div>
                  <input value={it.title} onChange={e => upd(it.id, { title: e.target.value })} className="w-full bg-transparent text-sm font-extrabold text-ink outline-none" />
                  <div className="truncate text-[10px] text-ink-mute">{it.url}</div>
                  <button onClick={() => openExternal(it.url)} className="clay-solid clay-sky mt-2 flex items-center gap-1 px-2.5 py-1 text-xs"><ExternalLink size={11} />Ouvrir</button>
                </div>
              )}
              <button onClick={() => setItems(a => a.filter(i => i.id !== it.id))} className="clay-solid clay-coral absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center !rounded-full p-0 opacity-0 group-hover:opacity-100"><X size={12} /></button>
              <div onPointerDown={e => rdown(e, it)} onPointerMove={rmove} onPointerUp={() => (rs.current = null)} className="clay-chip absolute -bottom-1.5 -right-1.5 h-5 w-5 cursor-nwse-resize opacity-0 group-hover:opacity-100" />
            </div>
          ))}
          {!items.length && <p className="absolute left-16 top-16 max-w-sm text-sm text-ink-mute">Votre bureau est vide. Ouvrez un site de références, copiez une image (clic droit → Copier l'image) puis collez-la ici avec ⌘V, ou glissez-la directement.</p>}
        </div>
      </div>
    </div>
  );
}
