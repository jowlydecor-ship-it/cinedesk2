import { Sparkles, Activity } from "lucide-react";
import TensionChart, { SEV_COLOR } from "./TensionChart";
import { fmt } from "../lib/doctor";
import { fmtDur } from "../lib/insights";

/* Panneau latéral compact : aperçu. Le détail complet est dans l'onglet « Analyse ». */
export default function DoctorPanel({ report, onOpenAnalysis }) {
  if (!report) return null;
  const m = report.metrics;
  return (
    <aside className="w-[340px] shrink-0 overflow-y-auto clay-card clay-stitch p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink"><Sparkles size={16} className="text-[#ff8a5b]" />Script Doctor</h2>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center text-[11px] text-ink-soft">
        {[["scènes", m.scenes], ["durée", fmtDur(report.runtime.total)], ["perso.", m.characters], ["dial. %", m.dialoguePct]].map(([l, v]) => (
          <div key={l} className="clay-chip !rounded-2xl py-1.5"><div className="text-base font-extrabold text-ink">{v}</div>{l}</div>
        ))}
      </div>

      <div className="mb-1 text-[11px] font-semibold text-ink-mute">Tension (survolez la courbe)</div>
      <div className="mb-4 clay-well p-2"><TensionChart report={report} height={110} compact onSelect={i => onOpenAnalysis({ scene: i })} /></div>

      {report.strengths.length > 0 && (
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-extrabold text-[#1f9b72]">Points forts</div>
          <ul className="space-y-1.5 text-[12px] text-ink-soft">{report.strengths.slice(0, 2).map((t, i) => <li key={i} className="clay-chip !rounded-2xl p-2">{t}</li>)}</ul>
        </div>
      )}

      <div className="mb-1.5 text-xs font-extrabold text-[#d9800d]">Failles ({report.flaws.length})</div>
      <ul className="mb-4 space-y-2">
        {report.flaws.slice(0, 4).map(f => (
          <li key={f.id}>
            <button onClick={() => onOpenAnalysis({ flaw: f.id })} className="clay-chip !rounded-2xl w-full p-2.5 text-left text-[12px] text-ink-soft hover:brightness-95">
              <div className="flex items-center gap-2 font-bold text-ink"><span className="h-2.5 w-2.5 shrink-0 rotate-45" style={{ background: SEV_COLOR[f.severity] }} />{f.title}</div>
              <div className="mt-0.5">{f.text}</div>
            </button>
          </li>
        ))}
        {!report.flaws.length && <li className="text-[12px] text-ink-mute">Aucune faille détectée.</li>}
      </ul>

      <button onClick={() => onOpenAnalysis({})} className="clay-solid clay-peach flex w-full items-center justify-center gap-2 py-2.5 text-sm"><Activity size={16} />Ouvrir l'analyse complète</button>
      <p className="mt-3 text-[10px] text-ink-mute">Tout est calculé sur votre Mac. Le Script Doctor ne modifie jamais votre texte. Médiane de tension : {fmt(report.median)}/10.</p>
    </aside>
  );
}
