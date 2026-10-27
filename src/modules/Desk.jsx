import { useEffect, useRef, useState } from "react";
import { StickyNote, Type, X, ExternalLink, ImagePlus, Download, Compass, Link2 } from "lucide-react";
import { uid } from "../lib/project";
import { fetchBlob, toDataUrl, LIMITS, kindOf } from "../lib/reader";
import Reference from "./Reference";
import { SewnButton, Tape, tilt } from "./Craft";
import { COLORS as POSTIT, COLOR_LIST, curlOf } from "../lib/postit";

const SITES = [["Pinterest", "https://www.pinterest.com", "clay-coral"], ["ShotDeck", "https://shotdeck.com", "clay-mint"], ["The Script Lab", "https://thescriptlab.com", "clay-butter"], ["CNC", "https://www.cnc.fr", "clay-lilac"]];
const TAGS = ["Lumière", "Décor", "Costume", "Cadrage", "Couleur", "Ambiance"];
const NOTE_COLORS = COLOR_LIST;
const TAPES = ["#ffc4d8", "#bfe8ff", "#ffe9a8", "#cfeccd", "#e3d3ff"];
const IMG = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|m4v)(\?.*)?$/i;

/* Les sites qui exigent une connexion s'ouvrent dans le navigateur (avec vos bloqueurs de publicités). */
async function openExternal(url) {
  try { const { openUrl } = await import("@tauri-apps/plugin-opener"); await openUrl(url); } catch { window.open(url, "_blank"); }
}

/* Réduit une image fixe (max 1100 px, JPEG) pour garder des projets légers. */
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
  const [notice, setNotice] = useState("");
  const [reader, setReader] = useState(true);

  const spot = () => ({ x: (scroller.current?.scrollLeft || 0) + 60 + Math.random() * 140, y: (scroller.current?.scrollTop || 0) + 60 + Math.random() * 100 });
  const upd = (id, p) => setItems(a => a.map(i => (i.id === id ? { ...i, ...p } : i)));
  const add = (it, at) => setItems(a => [...a, { id: uid(), z: a.reduce((m, i) => Math.max(m, i.z || 0), 0) + 1, tape: Math.floor(Math.random() * TAPES.length), ...(at || spot()), ...it }]);
  const front = id => setItems(a => { const z = a.reduce((m, i) => Math.max(m, i.z || 0), 0) + 1; return a.find(i => i.id === id)?.z === z - 1 ? a : a.map(i => (i.id === id ? { ...i, z } : i)); });

  /* médias venant d'un site : téléchargés dans le projet quand c'est raisonnable, sinon gardés en lien */
  const addMedia = async (m, at) => {
    setBusy(true);
    try {
      if (m.kind === "video") {
        let src = m.src, cached = false;
        try {
          const b = await fetchBlob(m.src);
          if (b.size <= LIMITS.video) { src = await toDataUrl(b); cached = true; }
          else setNotice("Vidéo trop lourde pour être incluse au projet (limite 12 Mo) : elle sera lue en ligne.");
        } catch { setNotice("Vidéo conservée en lien : elle nécessite Internet pour être lue."); }
        add({ kind: "video", src, poster: m.poster || null, w: 300, tag: "", caption: m.alt || "", remote: !cached }, at);
      } else {
        let src = m.src;
        try { const b = await fetchBlob(m.src); if (m.kind === "gif") { if (b.size <= LIMITS.gif) src = await toDataUrl(b); } else src = await shrink(b); } catch { /* repli : lien distant */ }
        add({ kind: "image", src, gif: m.kind === "gif", w: 260, tag: "", caption: m.alt || "" }, at);
      }
    } finally { setBusy(false); }
  };
  const addFile = async (f, at) => {
    setBusy(true);
    try {
      if (f.type === "image/gif") { f.size <= LIMITS.gif ? add({ kind: "image", gif: true, src: await toDataUrl(f), w: 260, tag: "", caption: "" }, at) : (setNotice("GIF trop lourd pour être sauvegardé (8 Mo) : visible jusqu'à la fermeture."), add({ kind: "image", gif: true, src: URL.createObjectURL(f), w: 260, tag: "", caption: "" }, at)); }
      else if (f.type.startsWith("image/")) add({ kind: "image", src: await shrink(f), w: 260, tag: "", caption: "" }, at);
      else if (f.type.startsWith("video/")) {
        if (f.size <= LIMITS.video) add({ kind: "video", src: await toDataUrl(f), w: 300, tag: "", caption: f.name }, at);
        else { setNotice("Vidéo trop lourde pour être sauvegardée avec le projet (12 Mo) : visible jusqu'à la fermeture."); add({ kind: "video", src: URL.createObjectURL(f), w: 300, tag: "", caption: f.name, remote: true }, at); }
      }
    } catch { setNotice("Ce fichier n'a pas pu être lu."); }
    setBusy(false);
  };
  const addFromUrl = async (url, at) => {
    if (IMG.test(url)) { await addMedia({ kind: kindOf(url), src: url }, at); return; }
    let host = url; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignoré */ }
    add({ kind: "link", url, title: host, w: 240, tag: "" }, at);
  };

  const onDrop = async e => {
    e.preventDefault();
    const r = canvas.current.getBoundingClientRect();
    const at = { x: Math.max(0, e.clientX - r.left - 60), y: Math.max(0, e.clientY - r.top - 40) };
    const raw = e.dataTransfer.getData("application/x-cinedesk-media");
    if (raw) { try { await addMedia(JSON.parse(raw), at); } catch { /* ignoré */ } return; }
    const files = [...e.dataTransfer.files].filter(f => /^(image|video)\//.test(f.type));
    if (files.length) { for (const [k, f] of files.entries()) await addFile(f, { x: at.x + k * 26, y: at.y + k * 26 }); return; }
    const html = e.dataTransfer.getData("text/html");
    const url = html.match(/<(?:img|video|source)[^>]+src=["']([^"']+)["']/i)?.[1] || e.dataTransfer.getData("text/uri-list").split("\n")[0] || e.dataTransfer.getData("text/plain");
    if (/^https?:\/\//i.test(url || "")) addFromUrl(url.trim(), at);
    else if (url?.startsWith("data:image")) add({ kind: "image", src: url, w: 260, tag: "", caption: "" }, at);
  };

  useEffect(() => {                                        // ⌘V : image, GIF, vidéo ou adresse
    const h = async e => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const f = [...(e.clipboardData?.files || [])].find(x => /^(image|video)\//.test(x.type));
      if (f) { e.preventDefault(); await addFile(f); return; }
      const t = e.clipboardData?.getData("text")?.trim();
      if (t && /^https?:\/\/\S+$/i.test(t)) { e.preventDefault(); addFromUrl(t); }
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  });

  const down = (e, it) => {
    if (e.target.closest("textarea,input,select,button,a,video")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y };
    front(it.id);
  };
  const move = e => { const d = drag.current; if (d) upd(d.id, { x: Math.max(0, d.ox + e.clientX - d.sx), y: Math.max(0, d.oy + e.clientY - d.sy) }); };
  const rdown = (e, it) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); rs.current = { id: it.id, sx: e.clientX, ow: it.w }; };
  const rmove = e => { const r = rs.current; if (r) upd(r.id, { w: Math.max(130, r.ow + e.clientX - r.sx) }); };

  const importScenes = () => {
    const have = new Set(items.filter(i => i.ref).map(i => i.ref));
    notes.filter(n => !have.has(n.id)).forEach((n, k) => add({ kind: "note", text: n.text, color: POSTIT[n.color] || POSTIT.A, w: 200, ref: n.id, tag: "" }, { x: 40 + (k % 5) * 220, y: 40 + Math.floor(k / 5) * 150 }));
  };
  const tags = [...new Set(items.map(i => i.tag).filter(Boolean))];
  const Caption = ({ it }) => (
    <>
      <input value={it.caption || ""} onChange={e => upd(it.id, { caption: e.target.value })} placeholder="Légende…" className="font-hand mt-1.5 w-full bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-mute" />
      <select value={it.tag || ""} onChange={e => upd(it.id, { tag: e.target.value })} className="clay-chip mt-1 px-2 py-0.5 text-[10px] font-semibold text-ink-soft outline-none">
        <option value="">Sans étiquette</option>{TAGS.map(t => <option key={t}>{t}</option>)}
      </select>
    </>
  );

  return (
    <div className="flex h-full gap-3 p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="clay-card flex flex-wrap items-center gap-2 p-3 text-xs">
          <button onClick={() => setReader(r => !r)} className={`flex items-center gap-1.5 px-3 py-1.5 ${reader ? "clay-solid clay-peach" : "clay-btn font-semibold"}`}><Compass size={13} />Explorateur Eye Candy / Film Grab</button>
          <span className="mx-1 h-5 w-px bg-[var(--line)]" />
          <button onClick={() => add({ kind: "note", text: "", color: NOTE_COLORS[0], w: 190, tag: "" })} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><StickyNote size={13} />Post-it</button>
          <button onClick={() => add({ kind: "text", text: "Titre", w: 220, tag: "" })} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><Type size={13} />Texte</button>
          <button onClick={importScenes} className="clay-btn flex items-center gap-1 px-3 py-1.5 font-semibold"><Download size={13} />Scènes du séquencier</button>
          <span className="ml-auto text-[10px] font-semibold text-ink-mute">Navigateur :</span>
          {SITES.map(([n, u, c]) => <button key={n} onClick={() => openExternal(u)} className={`clay-solid ${c} flex items-center gap-1 px-2.5 py-1`}>{n}<ExternalLink size={10} /></button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-ink-soft">
          <ImagePlus size={13} /> Glissez ici images, GIF, vidéos ou liens (depuis l'explorateur, le Finder ou un site) ou collez-les avec ⌘V. {busy && <b>Import…</b>}
          {tags.length > 0 && <span className="ml-3 font-bold text-ink">Filtrer :</span>}
          {tags.map(t => <button key={t} onClick={() => setFilter(filter === t ? null : t)} className={`px-2.5 py-0.5 font-semibold ${filter === t ? "clay-solid clay-peach" : "clay-chip"}`}>{t}</button>)}
        </div>
        {notice && <p className="flex items-center gap-2 rounded-2xl bg-[var(--warn)] px-3 py-2 text-xs font-semibold text-ink">⚠ {notice}<button onClick={() => setNotice("")} className="ml-auto text-ink-mute">✕</button></p>}

        <div ref={scroller} className="min-h-0 flex-1 overflow-auto clay-well">
          <div ref={canvas} onDragOver={e => e.preventDefault()} onDrop={onDrop} className="relative"
               style={{ width: 3200, height: 2200, backgroundImage: "radial-gradient(var(--dots) 1.6px, transparent 1.6px)", backgroundSize: "28px 28px" }}>
            {items.map(it => (
              <div key={it.id} onPointerDown={e => down(e, it)} onPointerMove={move} onPointerUp={() => (drag.current = null)}
                   style={{ left: it.x, top: it.y, width: it.w, zIndex: it.z || 1, touchAction: "none", transform: it.kind === "video" ? undefined : `rotate(${tilt(it.id)}deg)` }}
                   className={`group absolute cursor-grab active:cursor-grabbing ${filter && it.tag !== filter ? "opacity-25" : ""}`}>
                {it.kind === "image" && (
                  <div className="clay-card p-2" style={{ "--r": "28px" }}>
                    <Tape color={TAPES[it.tape ?? 0]} rotate={-5} style={{ top: -11, left: "calc(50% - 39px)" }} />
                    <img src={it.src} alt="" draggable={false} referrerPolicy="no-referrer" onDragStart={e => e.preventDefault()} className="w-full rounded-2xl" />
                    {it.gif && <span className="clay-chip absolute left-4 top-4 px-2 py-0.5 text-[9px] font-extrabold text-ink">GIF</span>}
                    <Caption it={it} />
                  </div>
                )}
                {it.kind === "video" && (
                  <div className="clay-card p-2" style={{ "--r": "28px" }}>
                    <Tape color={TAPES[it.tape ?? 1]} rotate={4} style={{ top: -11, left: "calc(50% - 39px)" }} />
                    <video src={it.src} poster={it.poster || undefined} controls loop muted playsInline preload="metadata" referrerPolicy="no-referrer" className="w-full rounded-2xl bg-[var(--frame)]" />
                    {it.remote && <span className="clay-chip absolute left-4 top-4 px-2 py-0.5 text-[9px] font-extrabold text-ink">EN LIGNE</span>}
                    <Caption it={it} />
                  </div>
                )}
                {it.kind === "note" && (
                  <div className="postit-shadow">
                    <div className={`postit ${curlOf(it.id)} px-3 pb-2 pt-3.5`} style={{ backgroundColor: it.color }}>
                      <textarea value={it.text} rows={3} onChange={e => upd(it.id, { text: e.target.value })} placeholder="Idée, scène, intention…" className="font-hand w-full resize-none bg-transparent text-[17px] leading-[1.25] text-[#2b2420] outline-none placeholder:text-[#2b242066]" />
                      <div className="mt-1 flex gap-1">{NOTE_COLORS.map(c => <button key={c} onClick={() => upd(it.id, { color: c })} className="h-3.5 w-3.5 rounded-full border border-black/25" style={{ background: c }} />)}</div>
                    </div>
                  </div>
                )}
                {it.kind === "text" && <div className="clay-card px-4 py-3"><textarea value={it.text} rows={1} onChange={e => upd(it.id, { text: e.target.value })} className="font-hand w-full resize-none bg-transparent text-xl font-extrabold text-ink outline-none" /></div>}
                {it.kind === "link" && (
                  <div className="clay-card relative p-3 pl-12">
                    <SewnButton size={26} color="#9fd4ff" holes={2} className="pointer-events-none absolute left-3 top-3" />
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-ink-mute"><Link2 size={11} />Lien</div>
                    <input value={it.title} onChange={e => upd(it.id, { title: e.target.value })} className="w-full bg-transparent text-sm font-extrabold text-ink outline-none" />
                    <div className="truncate text-[10px] text-ink-mute">{it.url}</div>
                    <button onClick={() => openExternal(it.url)} className="clay-solid clay-sky mt-2 flex items-center gap-1 px-2.5 py-1 text-xs"><ExternalLink size={11} />Ouvrir</button>
                  </div>
                )}
                <button onClick={() => setItems(a => a.filter(i => i.id !== it.id))} className="clay-solid clay-coral absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center !rounded-full p-0 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                <div onPointerDown={e => rdown(e, it)} onPointerMove={rmove} onPointerUp={() => (rs.current = null)} className="clay-chip absolute -bottom-1.5 -right-1.5 z-10 h-5 w-5 cursor-nwse-resize opacity-0 group-hover:opacity-100" />
              </div>
            ))}
            {!items.length && <p className="absolute left-16 top-16 max-w-sm text-sm text-ink-mute">Votre bureau est vide. Parcourez l'explorateur à droite et glissez une image, un GIF ou une vidéo ici (ou cliquez sur « + »), ou collez une image avec ⌘V.</p>}
          </div>
        </div>
      </div>
      {reader && <Reference onAdd={m => addMedia(m)} />}
    </div>
  );
}
