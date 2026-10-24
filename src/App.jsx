import { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue } from "react";
import {
  PenLine, StickyNote, Clapperboard, PanelLeft, Film, ClipboardList, LayoutDashboard, Activity, Sparkles,
  FilePlus2, FolderOpen, FileUp, Save, Download, Undo2, Redo2,
} from "lucide-react";
import { useProject } from "./hooks/useProject";
import { useLocalAI } from "./hooks/useLocalAI";
import { newProject, sampleProject, serialize, parseProject, syncNotes, generatePanels, ACTS } from "./lib/project";
import * as store from "./lib/storage";
import { toFountain, toFdx } from "./lib/formats";
import { screenplayPdf } from "./lib/pdf";
import { parseScript, breakdown } from "./lib/screenplay";
import { analyze } from "./lib/doctor";
import ScriptEditor from "./modules/ScriptEditor";
import PostItWall from "./modules/PostItWall";
import Storyboard from "./modules/Storyboard";
import Breakdown from "./modules/Breakdown";
import DoctorPanel from "./modules/DoctorPanel";
import Analysis from "./modules/Analysis";
import Desk from "./modules/Desk";
import ImportDialog from "./modules/ImportDialog";

const slug = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "scenario";
const PROJECT_FILTER = [{ name: "Projet CinéDesk", extensions: ["cinedesk"] }];
const OPEN_FILTER = [{ name: "Projet ou scénario", extensions: ["cinedesk", "pdf", "docx", "fdx", "fountain", "txt"] }];
const DOC_EXT = /\.(pdf|docx|fdx|fountain|txt|cinedesk)$/i;
const NAV = [
  { id: "script", label: "Scénario", icon: PenLine, c: "clay-sky" },
  { id: "wall", label: "Post-it", icon: StickyNote, c: "clay-butter" },
  { id: "board", label: "Storyboard", icon: Clapperboard, c: "clay-coral" },
  { id: "break", label: "Dépouillement", icon: ClipboardList, c: "clay-mint" },
  { id: "desk", label: "Bureau", icon: LayoutDashboard, c: "clay-lilac" },
  { id: "analysis", label: "Analyse", icon: Activity, c: "clay-peach", doctor: true },
];
const IconBtn = ({ icon: I, label, onClick, disabled }) => (
  <button title={label} onClick={onClick} disabled={disabled} className="rounded-xl p-2 text-ink-soft hover:clay-chip disabled:opacity-30"><I size={17} /></button>
);

export default function App() {
  const [init] = useState(sampleProject);
  const { project, set, undo, redo, load, markSaved, canUndo, canRedo, dirty } = useProject(init);
  const { meta, lines, notes, links, panels, desk } = project;

  const [view, setView] = useState("script");
  const [sidebar, setSidebar] = useState(true);
  const [ai, setAi] = useState(true);
  const [filter, setFilter] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [jumpTo, setJumpTo] = useState(null);
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const [menu, setMenu] = useState(false);
  const [filePath, setFilePath] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [ready, setReady] = useState(false);
  const [imp, setImp] = useState({ open: false, file: null });
  const tRef = useRef(null);
  const local = useLocalAI();

  const scenes = useMemo(() => parseScript(lines), [lines]);
  const slowScenes = useDeferredValue(scenes);
  const stats = useMemo(() => breakdown(scenes), [scenes]);
  const report = useMemo(() => (ai && slowScenes.length ? analyze(slowScenes, notes, ACTS) : null), [ai, slowScenes, notes]);
  const current = !ai && view === "analysis" ? "script" : view;

  const say = useCallback(msg => { setToast(msg); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), 3200); }, []);
  const ask = msg => new Promise(res => setDlg({ msg, res }));
  const proceed = async () => !dirty || (await ask("Des modifications ne sont pas enregistrées. Continuer et les perdre ?"));

  /* ── restauration / sauvegarde automatique ── */
  useEffect(() => {
    store.loadAutosave().then(t => { if (t) { try { load(parseProject(t)); } catch { /* ignoré */ } } }).finally(() => setReady(true));
  }, [load]);
  useEffect(() => {
    if (!ready || !dirty) return;
    const t = setTimeout(() => store.autosave(serialize(project)), 2500);
    return () => clearTimeout(t);
  }, [project, dirty, ready]);
  useEffect(() => { document.title = `${meta.title || "Sans titre"}${dirty ? " •" : ""} – CinéDesk`; }, [meta.title, dirty]);

  /* ── fichiers ── */
  const newDoc = async () => { if (!(await proceed())) return; load(newProject()); setFilePath(null); setView("script"); };
  const openProjectText = async (text, path) => {
    try { load(parseProject(text)); setFilePath(path || null); setView("script"); say("Projet ouvert"); }
    catch (e) { say("Ouverture impossible : " + e.message); }
  };
  /* point d'entrée commun : ouverture, glisser-déposer, bouton Importer */
  const handleFile = async f => {
    if (/\.cinedesk$/i.test(f.name)) { if (await proceed()) await openProjectText(new TextDecoder().decode(f.bytes), f.path); return; }
    setImp({ open: true, file: { name: f.name, bytes: f.bytes } });
  };
  const openDoc = async () => { try { const f = await store.openFile(OPEN_FILTER); if (f) await handleFile(f); } catch (e) { say("Ouverture impossible : " + e.message); } };
  const confirmImport = async (result, opt, name) => {
    if (!(await proceed())) return;
    const sc = parseScript(result.lines);
    load({
      ...newProject(),
      meta: { title: result.meta.title || name.replace(/\.[^.]+$/, ""), author: result.meta.author || "", contact: result.meta.contact || "" },
      lines: result.lines, notes: opt.notes ? syncNotes([], sc) : [], panels: opt.storyboard ? generatePanels(sc) : [],
    });
    setFilePath(null); setImp({ open: false, file: null }); setView("script");
    say(`« ${name} » importé : ${result.report.scenes} séquences, ${result.report.characters} personnages`);
  };
  const save = async (as = false) => {
    try {
      const json = serialize(project);
      const path = await store.saveText(`${slug(meta.title)}.cinedesk`, json, PROJECT_FILTER, as ? null : filePath);
      if (!path) return;
      setFilePath(path); markSaved(); store.autosave(json); say("Projet enregistré");
    } catch (e) { say("Échec de l'enregistrement : " + e.message); }
  };
  const exportAs = async kind => {
    setMenu(false);
    try {
      const base = slug(meta.title); let ok;
      if (kind === "pdf-us" || kind === "pdf-cnc")
        ok = await store.saveBytes(`${base}.pdf`, new Uint8Array(screenplayPdf(lines, meta, kind === "pdf-cnc" ? "cnc" : "hollywood")), [{ name: "PDF", extensions: ["pdf"] }]);
      else if (kind === "fdx") ok = await store.saveText(`${base}.fdx`, toFdx(lines), [{ name: "Final Draft", extensions: ["fdx"] }]);
      else ok = await store.saveText(`${base}.fountain`, toFountain(lines, meta), [{ name: "Fountain", extensions: ["fountain"] }]);
      if (ok) say("Export terminé");
    } catch (e) { say("Échec de l'export : " + e.message); }
  };

  /* ── raccourcis + glisser-déposer d'un document n'importe où dans la fenêtre ── */
  const api = useRef({});
  api.current = { save, openDoc, newDoc, undo, redo, handleFile };
  useEffect(() => {
    const key = e => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase(), a = api.current;
      if (k === "s") { e.preventDefault(); a.save(e.shiftKey); }
      else if (k === "o") { e.preventDefault(); a.openDoc(); }
      else if (k === "n") { e.preventDefault(); a.newDoc(); }
      else if (k === "z") { e.preventDefault(); e.shiftKey ? a.redo() : a.undo(); }
      else if (k === "y") { e.preventDefault(); a.redo(); }
    };
    const over = e => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); };
    const drop = async e => {
      if (e.defaultPrevented || !e.dataTransfer?.files?.length) return;       // déjà traité par un écran (images du storyboard / bureau…)
      e.preventDefault();                                                      // empêche la fenêtre de « naviguer » vers le fichier
      const f = [...e.dataTransfer.files].find(x => DOC_EXT.test(x.name));
      if (f) api.current.handleFile({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    };
    window.addEventListener("keydown", key); window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, []);

  /* ── liens scénario ⇄ post-it ⇄ analyse ── */
  const jump = i => { setView("script"); setJumpTo({ i, n: Date.now() }); };
  const showNote = heading => {
    const n = notes.find(x => x.heading === heading);
    if (!n) { say("Pas encore de post-it pour cette scène : utilisez « Synchroniser avec le scénario »."); return; }
    setView("wall"); setHighlight(n.id); setTimeout(() => setHighlight(null), 2500);
  };
  const sync = () => {
    const next = syncNotes(notes, scenes);
    if (next === notes) say("Le mur est déjà à jour");
    else { set.notes(next); say(`${next.length - notes.length} post-it ajouté(s)`); }
  };
  const openAnalysis = f => { setFocus({ ...f, n: Date.now() }); setView("analysis"); };

  return (
    <div className="flex h-screen flex-col gap-3 p-3">
      <header data-tauri-drag-region className="flex h-14 shrink-0 items-center gap-1 clay-card pl-24 pr-4">
        <IconBtn icon={PanelLeft} label="Afficher / masquer la barre latérale" onClick={() => setSidebar(s => !s)} />
        <Film size={16} className="mx-1 text-[#ff8a5b]" />
        <span data-tauri-drag-region className="mr-3 max-w-[220px] truncate text-sm font-extrabold text-ink">{meta.title || "Sans titre"}{dirty ? " •" : ""}</span>
        <IconBtn icon={FilePlus2} label="Nouveau (⌘N)" onClick={newDoc} />
        <IconBtn icon={FolderOpen} label="Ouvrir un projet ou un scénario (⌘O)" onClick={openDoc} />
        <button onClick={() => setImp({ open: true, file: null })} className="clay-solid clay-peach flex items-center gap-1.5 px-3 py-1.5 text-xs"><FileUp size={14} />Importer un scénario</button>
        <IconBtn icon={Save} label="Enregistrer (⌘S)" onClick={() => save(false)} />
        <div className="relative">
          <IconBtn icon={Download} label="Exporter" onClick={() => setMenu(m => !m)} />
          {menu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div className="absolute left-0 top-11 z-40 w-64 clay-card p-2 text-xs">
                {[["pdf-us", "PDF – norme Hollywood (Letter)"], ["pdf-cnc", "PDF – norme CNC (A4)"], ["fdx", "Final Draft (.fdx)"], ["fountain", "Fountain (.fountain)"]].map(([k, l]) => (
                  <button key={k} onClick={() => exportAs(k)} className="block w-full rounded-2xl px-3 py-2 text-left font-semibold text-ink hover:clay-chip">{l}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="mx-1 h-5 w-px bg-[#d9cff7]" />
        <IconBtn icon={Undo2} label="Annuler (⌘Z)" onClick={undo} disabled={!canUndo} />
        <IconBtn icon={Redo2} label="Rétablir (⇧⌘Z)" onClick={redo} disabled={!canRedo} />
        <div data-tauri-drag-region className="h-full flex-1" />
        <span className="mr-3 text-[11px] font-semibold text-ink-soft">{scenes.length} scènes · ≈ {stats.pages} p.</span>
        <Sparkles size={15} className={ai ? "text-[#ff8a5b]" : "text-ink-mute"} />
        <span className="mx-2 text-xs font-bold text-ink-soft">Script Doctor</span>
        <button role="switch" aria-checked={ai} onClick={() => setAi(a => !a)} className={`relative h-7 w-12 rounded-full transition ${ai ? "bg-[#7fe0b8]" : "bg-[#d9cff7]"}`} style={{ boxShadow: "inset 3px 3px 6px rgba(0,0,0,.15), inset -2px -2px 5px rgba(255,255,255,.7)" }}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${ai ? "left-[22px]" : "left-0.5"}`} style={{ boxShadow: "2px 3px 6px rgba(0,0,0,.25)" }} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        {sidebar && (
          <nav className="w-56 shrink-0 space-y-2 clay-card p-3">
            {NAV.filter(n => !n.doctor || ai).map(({ id, label, icon: I, c }) => (
              <button key={id} onClick={() => setView(id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${current === id ? `clay-solid ${c}` : "rounded-2xl font-semibold text-ink-soft hover:clay-chip"}`}>
                <span className={`clay-solid ${c} flex h-8 w-8 items-center justify-center !rounded-full`}><I size={16} /></span>{label}
              </button>
            ))}
          </nav>
        )}
        <main className="min-w-0 flex-1 overflow-auto rounded-[28px]">
          {current === "script" && <ScriptEditor lines={lines} setLines={set.lines} meta={meta} setMeta={set.meta} jumpTo={jumpTo} onShowNote={showNote} flags={report?.flags || {}} onOpenFlaw={id => openAnalysis({ flaw: id })} />}
          {current === "wall" && <PostItWall notes={notes} setNotes={set.notes} links={links} setLinks={set.links} scenes={scenes} filter={filter} setFilter={setFilter} highlight={highlight} onOpenScene={jump} onSync={sync} />}
          {current === "board" && <Storyboard scenes={scenes} panels={panels} setPanels={set.panels} />}
          {current === "break" && <Breakdown scenes={scenes} />}
          {current === "desk" && <Desk items={desk} setItems={set.desk} notes={notes} />}
          {current === "analysis" && report && <Analysis report={report} scenes={slowScenes} onJump={jump} ai={local} focus={focus} />}
        </main>
        {ai && current !== "analysis" && <DoctorPanel report={report} onOpenAnalysis={openAnalysis} />}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 clay-card !rounded-full px-5 py-2.5 text-xs font-bold text-ink">{toast}</div>}
      {imp.open && <ImportDialog file={imp.file} onPick={f => setImp({ open: true, file: f })} onClose={() => setImp({ open: false, file: null })} onConfirm={confirmImport} />}
      {dlg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2f2a5560] backdrop-blur-sm">
          <div className="w-80 clay-card p-5">
            <p className="mb-4 text-sm font-semibold text-ink">{dlg.msg}</p>
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => { dlg.res(false); setDlg(null); }} className="clay-btn px-3 py-2 font-semibold">Annuler</button>
              <button onClick={() => { dlg.res(true); setDlg(null); }} className="clay-solid clay-peach px-3 py-2">Continuer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
