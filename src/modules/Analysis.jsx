import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Cpu, Lightbulb } from "lucide-react";
import TensionChart, { SEV_COLOR } from "./TensionChart";
import { LineChart, BarChart } from "./Charts";
import { fmt } from "../lib/doctor";
import { fmtDur } from "../lib/insights";
import { deepMessages, fixMessages } from "../lib/llm";

const SEV_LABEL = { high: "Majeur", mid: "Moyen", low: "Mineur" };
const ACT_COLORS = ["#9fd4ff", "#ffdf6e", "#ffb98f", "#cdb4ff"];
const CHAR_COLORS = ["#ff7a59", "#6bb6ff", "#2fbf8f", "#8d6bff", "#ffb020"];
const STATUS = { ok: ["clay-mint", "✓ Solide"], warn: ["clay-butter", "⚠ À surveiller"], manual: ["clay-lilac", "✎ À évaluer"] };
const Card = ({ title, children, className = "", right }) => (
  <section className={`clay-card clay-stitch p-5 ${className}`}>
    {(title || right) && <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-ink">{title}</h3>{right}</div>}
    {children}
  </section>
);

export default function Analysis({ report, scenes, onJump, ai, focus, gridNotes, setGridNotes }) {
  const n = report.curve.length;
  const [sel, setSel] = useState(report.climax >= 0 ? report.climax : 0);
  const [sev, setSev] = useState("all");
  const [open, setOpen] = useState(new Set());
  const refs = useRef({});
  const [flash, setFlash] = useState(null);
  const [openG, setOpenG] = useState(() => new Set(["STRUCTURE NARRATIVE", "PERSONNAGES"]));

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
  const m = report.metrics, rt = report.runtime;
  const actIdx = i => Math.max(0, report.acts.findIndex(a => a.from != null && i + 1 >= a.from && i + 1 <= a.to));
  const top5 = report.characters.slice(0, 5);
  const tipHead = i => <div className="mb-1 font-extrabold text-ink">Scène {i + 1} · <span className="font-semibold">{scenes[i].heading}</span></div>;
  const groups = [];
  report.grid.forEach(g => { let x = groups.find(y => y[0] === g.group); if (!x) groups.push((x = [g.group, []])); x[1].push(g); });

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">
      <Card>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <h2 className="mr-3 text-lg font-extrabold text-ink">Analyse du Script Doctor</h2>
          {[[m.scenes, "scènes"], ["≈ " + fmtDur(rt.total), "durée estimée"], [m.pages, "pages"], [m.characters, "personnages"], [m.locations, "décors"], [m.dialoguePct + " %", "de dialogue"], [fmt(report.median), "tension médiane"]].map(([v, l]) => (
            <span key={l} className="clay-chip px-3 py-1 font-bold text-ink">{v} <span className="font-medium text-ink-soft">{l}</span></span>
          ))}
        </div>
      </Card>

      <Card title="Courbe de tension — survolez pour comprendre chaque scène, cliquez pour l'épingler">
        <div className="clay-well p-3"><TensionChart report={report} height={260} selected={sel} onSelect={setSel} /></div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-soft">
          <span><b className="text-[#e5532d]">▲</b> pic</span><span><b className="text-[#3a8fd9]">▼</b> creux</span>
          <span><b style={{ color: SEV_COLOR.high }}>◆</b> <b style={{ color: SEV_COLOR.mid }}>◆</b> <b style={{ color: SEV_COLOR.low }}>◆</b> faille (majeure / moyenne / mineure)</span>
          <span><b className="text-[#8d6bff]">· · ·</b> tendance (escalade des enjeux)</span>
          <span>tirets : repères à 25 / 50 / 75 %</span>
        </div>
      </Card>

      {info && (
        <Card title={`Scène ${info.id} — ${info.heading}`} right={<span className="text-xs font-semibold text-ink-mute">≈ {fmtDur(info.minute)} dans le film</span>}>
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

      <Card title="Durée et rythme">
        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
          <div>
            <div className="text-4xl font-extrabold text-ink">≈ {fmtDur(rt.total)}</div>
            <p className="mt-1 text-xs text-ink-soft">Fourchette : {fmtDur(rt.low)} à {fmtDur(rt.high)}. Règle de la page (1 page ≈ 1 min) : {fmtDur(rt.pageMin)} · débit des mots : {fmtDur(rt.wordMin)}. Estimation indicative (±15 %).</p>
            <div className="mt-3 flex h-4 overflow-hidden clay-well !rounded-full">
              {report.acts.map((a, k) => <div key={a.name} title={`${a.name} : ${fmtDur(a.minutes)}`} style={{ width: `${(a.minutes / (rt.total || 1)) * 100}%`, background: ACT_COLORS[k] }} />)}
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {report.acts.map((a, k) => (
                <li key={a.name} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: ACT_COLORS[k] }} /><b className="text-ink">{a.name}</b>
                  <span className="text-ink-soft">{a.from ? `sc. ${a.from}–${a.to}` : "—"} · {fmtDur(a.minutes)} ({Math.round((a.minutes / (rt.total || 1)) * 100)} %)</span></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div><div className="mb-1 text-xs font-bold text-ink-soft">Durée de chaque scène (minutes), colorée par acte</div>
              <div className="clay-well p-3"><BarChart series={[{ name: "durée", color: "#ffb98f", values: rt.dur }]} color={i => ACT_COLORS[actIdx(i)]} yFmt={v => (v < 1 ? v.toFixed(1) : Math.round(v))}
                tip={i => <>{tipHead(i)}<div>Durée ≈ {fmtDur(rt.dur[i])} · démarre à {fmtDur(rt.start[i])}</div><div>{report.acts[actIdx(i)].name}</div></>} /></div></div>
            <div><div className="mb-1 text-xs font-bold text-ink-soft">Dialogue <span className="text-[#2fbf8f]">■</span> et action <span className="text-[#ffb020]">■</span> par scène (mots)</div>
              <div className="clay-well p-3"><BarChart series={[{ name: "dialogue", color: "#8fe8c2", values: scenes.map(s => s.dialogueWords) }, { name: "action", color: "#ffdf6e", values: scenes.map(s => s.actionWords) }]}
                tip={i => <>{tipHead(i)}<div>Dialogue : {scenes[i].dialogueWords} mots</div><div>Action : {scenes[i].actionWords} mots</div></>} /></div></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Structure du récit (modèle en 3 actes)">
          {report.beats.length ? (
            <ul className="space-y-2">
              {report.beats.map(b => (
                <li key={b.name} className="clay-chip !rounded-2xl p-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ${b.found ? "bg-[#2fbf8f]" : b.strict ? "bg-[#ff6b6b]" : "bg-[#b9aee6]"}`}>{b.found ? "✓" : b.strict ? "✕" : "·"}</span>
                    {b.name} <span className="font-medium text-ink-mute">≈ {b.at} % · {fmtDur(b.minute)}</span>
                    <button onClick={() => setSel(b.scene - 1)} className="ml-auto text-[11px] font-semibold text-[var(--accent)] underline">scène {b.scene}</button>
                  </div>
                  <p className="mt-1 text-ink-soft">{b.why}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-mute">Il faut au moins 6 scènes pour évaluer la structure.</p>}
        </Card>

        <Card title="Les 4 critères du diagnostic">
          <ul className="space-y-2">
            {report.criteria.map(c => (
              <li key={c.key} className="clay-chip !rounded-2xl p-3 text-xs">
                <div className="mb-1 flex items-center gap-2 font-extrabold text-ink">{c.label}<span className={`clay-solid ${STATUS[c.status][0]} ml-auto px-2.5 py-0.5 !text-[10px]`}>{STATUS[c.status][1]}</span></div>
                <p className="text-ink-soft">{c.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Personnages : présence, répliques et poids dans le dialogue">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wide text-ink-mute"><th className="pb-2">Personnage</th><th>Scènes</th><th>Répliques</th><th>Mots</th><th className="w-40">Part du dialogue</th><th>1re → dernière</th></tr></thead>
            <tbody>
              {report.characters.map((c, k) => (
                <tr key={c.name} className="border-t border-[var(--soft)] text-ink">
                  <td className="py-1.5 font-extrabold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHAR_COLORS[k % 5] }} />{c.name}</td>
                  <td>{c.scenes}/{n}</td><td>{c.lines}</td><td>{c.words}</td>
                  <td><div className="flex items-center gap-2"><div className="h-2.5 flex-1 overflow-hidden clay-well !rounded-full"><div className="h-full rounded-full" style={{ width: `${c.share}%`, background: CHAR_COLORS[k % 5] }} /></div><span className="w-8 text-right font-bold">{c.share} %</span></div></td>
                  <td className="text-ink-soft">sc. {c.first} → {c.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mb-1 mt-5 text-xs font-bold text-ink-soft">Parole cumulée des personnages principaux au fil du film (mots)</div>
        <div className="clay-well p-3">
          <LineChart series={top5.map((c, k) => ({ name: c.name, color: CHAR_COLORS[k], values: c.cum }))}
            tip={i => <>{tipHead(i)}{top5.map((c, k) => <div key={c.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHAR_COLORS[k] }} /><b className="text-ink">{c.name}</b> {c.cum[i]} mots ({c.pres[i] ? (c.cells[i] ? `+${c.cells[i]} ici` : "présent·e, sans parole") : "absent"})</div>)}</>} />
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-soft">{top5.map((c, k) => <span key={c.name}><b style={{ color: CHAR_COLORS[k] }}>●</b> {c.name}</span>)}</div>
        </div>
        <div className="mb-1 mt-5 text-xs font-bold text-ink-soft">Présence scène par scène : dialogue ou action (survolez une case)</div>
        <div className="overflow-x-auto pb-1">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `110px repeat(${n}, 20px)` }}>
            <div />{scenes.map(s => <div key={s.id} className="text-center text-[9px] text-ink-mute">{s.id}</div>)}
            {report.characters.map(c => (
              <div key={c.name} className="contents">
                <div className="truncate pr-2 text-[11px] font-bold text-ink">{c.name}</div>
                {c.pres.map((on, i) => { const w = c.cells[i], a = c.acts[i]; return <div key={i} title={on ? `${c.name} · scène ${i + 1} · ${w} mot(s) de dialogue · ${a} action(s)` : ""} className="h-5 rounded-md" style={{ background: on ? `rgba(255,122,89,${Math.min(1, 0.35 + (w + a * 4) / 60)})` : "var(--soft)" }} />; })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Grille d'analyse du scénario (pré-remplie, à compléter)">
        <p className="mb-3 text-xs text-ink-mute">
          Colonne centrale : déduite du texte. Colonne de droite : vos notes, sauvegardées avec le projet. Sources d'inspiration (formulations propres à CinéDesk) : grille d'analyse d'Anna Marmiesse
          (Lycéens et apprentis au cinéma), modèle actantiel de Greimas et propositions dramatique / thématique d'un cours de scénario, trame en 22 étapes de John Truby.
        </p>
        {groups.map(([name, rows]) => {
          const isOpen = openG.has(name), filled = rows.filter(r => (gridNotes[r.key] || "").trim()).length;
          return (
            <div key={name} className="mb-2">
              <button onClick={() => setOpenG(o => { const x = new Set(o); x.has(name) ? x.delete(name) : x.add(name); return x; })}
                className="clay-chip flex w-full items-center gap-2 !rounded-2xl px-4 py-2 text-left text-[11px] font-extrabold tracking-wide text-[var(--accent)]">
                <span>{isOpen ? "▾" : "▸"}</span>{name}<span className="ml-auto font-semibold text-ink-mute">{filled}/{rows.length} complétées</span>
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2 px-1">
                  {rows.map(g => (
                    <div key={g.key} className="grid gap-3 md:grid-cols-[190px_1fr_1fr]">
                      <div className="pt-1.5 text-xs font-extrabold text-ink">{g.label}</div>
                      <div className="clay-chip !rounded-2xl p-2.5 text-xs text-ink-soft">{g.auto || "—"}</div>
                      <textarea rows={2} value={gridNotes[g.key] || ""} onChange={e => setGridNotes(o => ({ ...o, [g.key]: e.target.value }))} placeholder="Mes notes…" className="clay-well resize-none p-2.5 text-xs text-ink outline-none placeholder:text-ink-mute" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

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
              {open.has(f.id) && <p className="mt-3 rounded-2xl bg-[var(--warn)] p-3 text-ink"><b>Piste : </b>{f.fix}</p>}
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
        ) : <p className="text-xs text-ink-mute">Aucun modèle local détecté. Le moteur ci-dessus fonctionne sans IA ; voir BUILD.md pour installer Ollama et activer cette option (utile pour l'arc du personnage et le sens des scènes).</p>}
        {(ai.out.text || ai.out.err) && (
          <div className="mt-4 whitespace-pre-wrap clay-well p-4 text-[13px] leading-relaxed text-ink-soft">
            {ai.out.title && <div className="mb-1 font-extrabold text-ink">{ai.out.title}</div>}{ai.out.text}{ai.out.err && <span className="text-red-500">{ai.out.err}</span>}
          </div>
        )}
      </Card>
    </div>
  );
}
