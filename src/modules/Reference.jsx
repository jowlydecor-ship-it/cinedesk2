import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, ExternalLink, ShieldCheck, Loader2, Search } from "lucide-react";
import { fetchPage } from "../lib/reader";

const SITES = [["Film Grab", "https://film-grab.com", "clay-sky"], ["Eye Candy", "https://eyecannndy.com", "clay-pink"]];
const FILTERS = [["all", "Tout"], ["image", "Images"], ["gif", "GIF"], ["video", "Vidéos"]];

async function openExternal(url) {
  try { const { openUrl } = await import("@tauri-apps/plugin-opener"); await openUrl(url); } catch { window.open(url, "_blank"); }
}

/* Explorateur de références intégré : le site est lu puis « nettoyé » (médias uniquement), donc sans publicité,
   sans bandeau de cookies et sans script tiers. Glissez une carte vers le bureau ou cliquez sur « + ». */
export default function Reference({ onAdd }) {
  const [hist, setHist] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [page, setPage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const scroller = useRef(null);

  const go = async (url, push = true) => {
    setBusy(true); setErr("");
    try {
      const p = await fetchPage(url);
      setPage(p);
      if (push) { setHist(h => [...h.slice(0, idx + 1), p.url]); setIdx(i => i + 1); }
      scroller.current?.scrollTo({ top: 0 });
    } catch (e) { setErr(`${e.message || e} Ce site n'est peut-être pas lisible en mode épuré (connexion requise ou contenu dynamique) : essayez « Ouvrir dans le navigateur ».`); }
    setBusy(false);
  };
  const back = () => { if (idx > 0) { setIdx(idx - 1); go(hist[idx - 1], false); } };
  const fwd = () => { if (idx < hist.length - 1) { setIdx(idx + 1); go(hist[idx + 1], false); } };
  const submit = () => {
    const v = q.trim(); if (!v) return;
    go(/^https?:\/\//i.test(v) ? v : /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v) ? "https://" + v : `https://film-grab.com/?s=${encodeURIComponent(v)}`);
  };
  useEffect(() => { go("https://eyecannndy.com"); }, []);   // démarre sur Eye Candy

  const items = (page?.media || []).filter(m => kind === "all" || m.kind === kind);
  const drag = (e, m) => { e.dataTransfer.setData("application/x-cinedesk-media", JSON.stringify(m)); e.dataTransfer.setData("text/uri-list", m.src); e.dataTransfer.effectAllowed = "copy"; };

  return (
    <aside className="flex h-full w-[430px] shrink-0 flex-col clay-card clay-stitch p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <button onClick={back} disabled={idx <= 0} className="clay-btn p-2 disabled:opacity-40"><ArrowLeft size={14} /></button>
        <button onClick={fwd} disabled={idx >= hist.length - 1} className="clay-btn p-2 disabled:opacity-40"><ArrowRight size={14} /></button>
        <div className="clay-well flex flex-1 items-center gap-2 px-3 py-1.5">
          <Search size={13} className="text-ink-mute" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Adresse ou mot-clé (Film Grab)…" className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-mute" />
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {SITES.map(([n, u, c]) => <button key={n} onClick={() => go(u)} className={`clay-solid ${c} px-3 py-1`}>{n}</button>)}
        {page && <button onClick={() => openExternal(page.url)} className="clay-chip ml-auto flex items-center gap-1 px-2.5 py-1 font-semibold text-ink-soft"><ExternalLink size={11} />Ouvrir dans le navigateur</button>}
      </div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px]">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={`px-2.5 py-0.5 font-semibold ${kind === k ? "clay-solid clay-peach" : "clay-chip text-ink-soft"}`}>{l}</button>)}
        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[#1f9b72]"><ShieldCheck size={12} />sans pub ni cookies</span>
      </div>
      {page && <div className="mb-2 truncate text-[11px] font-bold text-ink-soft">{page.title || page.url}</div>}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {busy && <div className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-ink-soft"><Loader2 size={15} className="animate-spin" />Lecture de la page…</div>}
        {err && <p className="clay-chip !rounded-2xl p-3 text-xs text-ink-soft">{err}</p>}
        {!busy && page && !items.length && !err && <p className="py-8 text-center text-xs text-ink-mute">Aucun média trouvé sur cette page. Essayez une autre page ou un autre filtre.</p>}
        <div className="columns-2 gap-3">
          {items.map(m => (
            <div key={m.src} draggable onDragStart={e => drag(e, m)} className="group relative mb-3 break-inside-avoid clay-card !rounded-2xl p-1.5">
              {m.kind === "video"
                ? <video src={m.src} poster={m.poster || undefined} muted loop playsInline preload="metadata" referrerPolicy="no-referrer" className="w-full rounded-xl"
                    onMouseEnter={e => e.currentTarget.play().catch(() => {})} onMouseLeave={e => e.currentTarget.pause()} />
                : <img src={m.thumb || m.src} alt={m.alt || ""} loading="lazy" referrerPolicy="no-referrer" draggable={false} className="w-full rounded-xl" />}
              {(m.kind === "video" || m.kind === "gif") && <span className="clay-chip absolute left-3 top-3 px-2 py-0.5 text-[9px] font-extrabold text-ink">{m.kind === "gif" ? "GIF" : "▶ VIDÉO"}</span>}
              <div className="absolute right-2.5 top-2.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button title="Ajouter au bureau" onClick={() => onAdd(m)} className="clay-solid clay-mint flex h-7 w-7 items-center justify-center !rounded-full"><Plus size={14} /></button>
                {m.page && <button title="Voir cette page" onClick={() => go(m.page)} className="clay-solid clay-sky flex h-7 w-7 items-center justify-center !rounded-full"><ArrowRight size={13} /></button>}
              </div>
              {m.alt && <div className="truncate px-1 pt-1 text-[10px] font-semibold text-ink-soft">{m.alt}</div>}
            </div>
          ))}
        </div>
        {page?.next && !busy && <button onClick={() => go(page.next)} className="clay-solid clay-lilac mb-2 w-full py-2 text-xs">Page suivante →</button>}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-ink-mute">Pinterest, Instagram et ShotDeck exigent une connexion : ils ne peuvent pas être lus ici. Copiez-y une image (clic droit) puis collez-la (⌘V) dans le bureau.</p>
    </aside>
  );
}
