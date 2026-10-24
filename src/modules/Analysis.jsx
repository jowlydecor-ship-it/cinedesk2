import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Cpu, Lightbulb } from "lucide-react";
import TensionChart, { SEV_COLOR } from "./TensionChart";
import { fmt } from "../lib/doctor";
import { deepMessages, fixMessages } from "../lib/llm";

const SEV_LABEL = { high: "Majeur", mid: "Moyen", low: "Mineur" };
const Card = ({ title, children, className = "" }) => (
  <section className={`clay-card p-5 ${className}`}>{title && <h3 className="mb-3 text-sm font-extrabold text-ink">{title}</h3>}{children}</section>
);

export default function Analysis({ report, scenes, onJump, ai, focus }) {
  const n = report.curve.length;
  const [sel, setSel] = useState(report.climax >= 0 ? report.climax : 0);
  const [sev, setSev] = useState("all");
  const [open, setOpen] = useState(new Set());
  const refs = useRef({});
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!focus) return;
    if (focus.scene != null) setSel(Math.min(focus.scene, n - 1));
    if (focus.flaw != null) {
      const f = report.flaws.find(x => x.id === focus.flaw);
      if (f?.scenes[0]) setSel(f.scenes[0] - 1);
      setFlash(focus.flaw);
      setTimeout(() => refs.current[focus.flaw]?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
      setTimeout(() => setFlash(null), 2500);
    }
  }, [focus]);

  const info = report.scenes[Math.min(sel, n - 1)];
  const maxP = Math.max(1, ...(info?.factors.map(f => f.points) || [1]));
  const flaws = report.flaws.filter(f => sev === "all" || f.severity === sev);
  const m = report.metrics;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">
      <Card>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <h2 className="mr-3 text-lg font-extrabold text-ink">Analyse du Script Doctor</h2>
          {[[m.scenes, "scènes"], [m.pages, "pages"], [m.characters, "personnages"], [m.locations, "décors"], [m.dialoguePct + " %", "de dialogue"], [fmt(report.median), "tension médiane"]].map(([v, l]) => (
            <span key={l} className="clay-chip px-3 py-1 font-bold text-ink">{v} <span className="font-medium text-ink-soft">{l}</span></span>
          ))}
        </div>
      </Card>

      <Card title="Courbe de tension — survolez pour comprendre chaque scène, cliquez pour l'épingler">
        <div className="clay-well p-3"><TensionChart report={report} height={250} selected={sel} onSelect={setSel} /></div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-soft">
          <span><b className="text-[#e5532d]">▲</b> pic</span><span><b className="text-[#3a8fd9]">▼</b> creux</span>
          <span><b style={{ color: SEV_COLOR.high }}>◆</b> <b style={{ color: SEV_COLOR.mid }}>◆</b> <b style={{ color: SEV_COLOR.low }}>◆</b> faille (majeure / moyenne / mineure)</span>
          <span>tirets violets : repères à 25 / 50 / 75 %</span>
        </div>
      </Card>

      {info && (
        <Card title={`Scène ${info.id} — ${info.heading}`}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-baseline gap-2"><span className="text-4xl font-extrabold text-[#ff7a59]">{fmt(info.value)}</span><span className="text-ink-mute">/ 10</span>
                {info.role && <span className="ml-2 clay-chip px-2.5 py-0.5 text-xs font-bold text-ink">{info.role === "pic" ? "▲ pic de tension" : "▼ creux"}</span>}</div>
              <p className="text-sm text-ink-soft">{info.summary}</p>
              {info.trend && <p className="mt-2 text-sm font-semibold text-ink">↳ {info.trend}</p>}
              <button onClick={() => onJump(scenes[info.id - 1].start)} className="clay-solid clay-sky mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"><ArrowUpRight size={14} />Ouvrir dans le scénario</button>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold text-ink-soft">Pourquoi cette valeur ? (poids de chaque facteur)</div>
              <ul className="space-y-2">
                {info.factors.map(f => (
                  <li key={f.key} className="text-xs">
                    <div className="mb-0.5 flex justify-between font-semibold text-ink"><span>{f.label}</span><span>+{f.points}</span></div>
                    <div className="h-2.5 overflow-hidden clay-well !rounded-full"><div className="h-full rounded-full bg-gradient-to-r from-[#ffb98f] to-[#ff7a59]" style={{ width: `${(f.points / maxP) * 100}%` }} /></div>
                    {f.detail && <div className="mt-0.5 text-ink-mute">{f.detail}</div>}
                  </li>
                ))}
                {!info.factors.length && <li className="text-xs text-ink-mute">Aucun marqueur de tension dans cette scène.</li>}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Structure du récit">
          {report.beats.length ? (
            <ul className="space-y-2">
              {report.beats.map(b => (
                <li key={b.name} className="clay-chip !rounded-2xl p-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ${b.found ? "bg-[#2fbf8f]" : "bg-[#ff6b6b]"}`}>{b.found ? "✓" : "✕"}</span>
                    {b.name} <span className="font-medium text-ink-mute">≈ {b.at} %</span>
                    <button onClick={() => setSel(b.scene - 1)} className="ml-auto text-[11px] font-semibold text-[#6b4de0] underline">scène {b.scene}</button>
                  </div>
                  <p className="mt-1 text-ink-soft">{b.why}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-mute">Il faut au moins 6 scènes pour évaluer la structure.</p>}
        </Card>

        <Card title="Présence des personnages (survolez une case)">
          <div className="overflow-x-auto pb-1">
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `110px repeat(${n}, 20px)` }}>
              <div />{scenes.map(s => <div key={s.id} className="text-center text-[9px] text-ink-mute">{s.id}</div>)}
              {report.characters.map(c => (
                <div key={c.name} className="contents">
                  <div className="truncate pr-2 text-[11px] font-bold text-ink">{c.name}</div>
                  {c.cells.map((w, i) => (
                    <div key={i} title={w ? `${c.name} · scène ${i + 1} · ${w} mot(s)` : ""} className="h-5 rounded-md"
                         style={{ background: w ? `rgba(255,122,89,${Math.min(1, 0.3 + w / 60)})` : "#ece4fb" }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title={`Failles et incohérences (${report.flaws.length})`}>
        <div className="mb-3 flex gap-2 text-xs">
          {[["all", "Toutes"], ["high", "Majeures"], ["mid", "Moyennes"], ["low", "Mineures"]].map(([k, l]) => (
            <button key={k} onClick={() => setSev(k)} className={`px-3 py-1 font-semibold ${sev === k ? "clay-solid clay-peach" : "clay-chip text-ink-soft"}`}>{l}</button>
          ))}
        </div>
        <ul className="space-y-3">
          {flaws.map(f => (
            <li key={f.id} ref={el => (refs.current[f.id] = el)} className={`clay-chip !rounded-3xl p-4 text-[13px] text-ink-soft ${flash === f.id ? "ring-4 ring-[#ff8a5b]" : ""}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ background: SEV_COLOR[f.severity] }}>{SEV_LABEL[f.severity]}</span>
                <span className="font-extrabold text-ink">{f.title}</span>
              </div>
              <p className="font-semibold text-ink">{f.text}</p>
              <p className="mt-1.5"><b className="text-ink">Pourquoi : </b>{f.why}</p>
              {f.scenes.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs"><b className="text-ink">Où :</b>
                  {f.scenes.slice(0, 10).map(id => <button key={id} onClick={() => setSel(id - 1)} className="clay-btn px-2 py-0.5 font-semibold">scène {id}</button>)}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button onClick={() => onJump(f.lines[0] ?? scenes[f.scenes[0] - 1]?.start ?? 0)} className="clay-solid clay-sky flex items-center gap-1 px-2.5 py-1"><ArrowUpRight size={12} />Voir dans le scénario</button>
                {!open.has(f.id) && <button onClick={() => setOpen(s => new Set(s).add(f.id))} className="clay-solid clay-butter flex items-center gap-1 px-2.5 py-1"><Lightbulb size={12} />Proposer une solution</button>}
                {ai.model && <button onClick={() => ai.run(f.title, fixMessages(scenes, report, f))} className="clay-solid clay-lilac flex items-center gap-1 px-2.5 py-1"><Cpu size={12} />Pistes IA</button>}
              </div>
              {open.has(f.id) && <p className="mt-3 rounded-2xl bg-[#fff3c4] p-3 text-ink"><b>Piste : </b>{f.fix}</p>}
            </li>
          ))}
          {!flaws.length && <li className="text-sm text-ink-mute">Rien à signaler dans cette catégorie.</li>}
        </ul>
      </Card>

      <Card title="Analyse approfondie (IA locale)">
        {ai.model ? (
          <button disabled={ai.out.busy} onClick={() => ai.run("Diagnostic complet", deepMessages(scenes, report))} className="clay-solid clay-lilac px-4 py-2 text-sm disabled:opacity-50">
            {ai.out.busy ? "Analyse en cours…" : `Lancer avec ${ai.model}`}
          </button>
        ) : <p className="text-xs text-ink-mute">Aucun modèle local détecté. Le moteur ci-dessus fonctionne sans IA ; voir BUILD.md pour installer Ollama et activer cette option.</p>}
        {(ai.out.text || ai.out.err) && (
          <div className="mt-4 whitespace-pre-wrap clay-well p-4 text-[13px] leading-relaxed text-ink-soft">
            {ai.out.title && <div className="mb-1 font-extrabold text-ink">{ai.out.title}</div>}{ai.out.text}{ai.out.err && <span className="text-red-500">{ai.out.err}</span>}
          </div>
        )}
      </Card>
    </div>
  );
}
