import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { importDocument } from "../lib/importer";

const BADGE = { heading: ["Séquence", "clay-sky"], character: ["Personnage", "clay-peach"], dialogue: ["Dialogue", "clay-mint"], parenthetical: ["Parenthèse", "clay-lilac"], transition: ["Transition", "clay-butter"], action: ["Action", ""] };
const CONF = { élevée: "clay-mint", moyenne: "clay-butter", faible: "clay-coral" };

export default function ImportDialog({ file, onPick, onClose, onConfirm }) {
  const [st, setSt] = useState({ phase: "idle", result: null, err: "" });
  const [opt, setOpt] = useState({ notes: true, storyboard: true });
  const input = useRef(null);

  useEffect(() => {
    if (!file) { setSt({ phase: "idle", result: null, err: "" }); return; }
    let dead = false;
    setSt({ phase: "work", result: null, err: "" });
    importDocument(file.name, file.bytes)
      .then(r => !dead && setSt({ phase: "done", result: r, err: "" }))
      .catch(e => !dead && setSt({ phase: "error", result: null, err: e.message || String(e) }));
    return () => { dead = true; };
  }, [file]);

  const read = async f => { if (f) onPick({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); };
  const r = st.result?.report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm">
      <div className="max-h-[90vh] w-[640px] overflow-y-auto clay-card p-6">
        <h2 className="mb-1 text-lg font-extrabold text-ink">Importer un scénario</h2>
        <p className="mb-4 text-xs text-ink-soft">PDF, Word (.docx), Final Draft (.fdx), Fountain ou texte. CinéDesk reconnaît les séquences, personnages, dialogues et actions, puis reconstruit le séquencier.</p>

        {(st.phase === "idle" || st.phase === "error") && (
          <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); read(e.dataTransfer.files[0]); }}
               className="mb-3 flex flex-col items-center gap-3 clay-well px-6 py-10 text-center">
            <FileUp size={34} className="text-[#8d6bff]" />
            <p className="text-sm font-semibold text-ink">Glissez votre scénario ici</p>
            <button onClick={() => input.current.click()} className="clay-solid clay-sky px-4 py-2 text-sm">Choisir un fichier</button>
            <input ref={input} type="file" accept=".pdf,.docx,.fdx,.fountain,.txt" className="hidden" onChange={e => read(e.target.files[0])} />
            {st.err && <p className="text-xs font-semibold text-red-500">{st.err}</p>}
          </div>
        )}

        {st.phase === "work" && <div className="flex items-center justify-center gap-3 clay-well py-12 text-sm font-semibold text-ink-soft"><Loader2 className="animate-spin" size={18} />Analyse de « {file?.name} »…</div>}

        {st.phase === "done" && r && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="clay-chip px-3 py-1 font-bold text-ink">{r.kind}{r.pages ? ` · ${r.pages} p.` : ""}</span>
              <span className="clay-chip px-3 py-1 font-bold text-ink">{r.scenes} séquences</span>
              <span className="clay-chip px-3 py-1 font-bold text-ink">{r.characters} personnages</span>
              <span className="clay-chip px-3 py-1 font-bold text-ink">{r.dialogues} répliques</span>
              <span className={`clay-solid ${CONF[r.confidence]} px-3 py-1`}>Fiabilité : {r.confidence}</span>
            </div>
            {r.warnings.map((w, i) => <p key={i} className="mb-2 rounded-2xl bg-[var(--warn)] p-3 text-xs text-ink">⚠ {w}</p>)}
            <div className="mb-1 text-xs font-bold text-ink-soft">Aperçu de la reconnaissance</div>
            <ul className="mb-4 max-h-56 space-y-1 overflow-y-auto clay-well p-3">
              {st.result.lines.slice(0, 16).map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]">
                  <span className={`clay-solid ${BADGE[l.type][1]} w-[84px] shrink-0 px-2 py-0.5 text-center !text-[10px]`}>{BADGE[l.type][0]}</span>
                  <span className="line-clamp-2 text-ink-soft">{l.text}</span>
                </li>
              ))}
            </ul>
            <div className="mb-4 space-y-1.5 text-sm text-ink">
              <label className="flex items-center gap-2"><input type="checkbox" checked={opt.notes} onChange={e => setOpt(o => ({ ...o, notes: e.target.checked }))} />Construire le séquencier (un post-it par séquence)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={opt.storyboard} onChange={e => setOpt(o => ({ ...o, storyboard: e.target.checked }))} />Préparer le storyboard (un plan d'ensemble par séquence)</label>
              <p className="pl-6 text-xs text-ink-mute">Le dépouillement et l'analyse du Script Doctor se mettent à jour automatiquement.</p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 text-sm">
          <button onClick={onClose} className="clay-btn px-4 py-2 font-semibold">Annuler</button>
          {st.phase === "done" && <button onClick={() => onConfirm(st.result, opt, file.name)} className="clay-solid clay-peach px-4 py-2">Importer dans CinéDesk</button>}
        </div>
      </div>
    </div>
  );
}
