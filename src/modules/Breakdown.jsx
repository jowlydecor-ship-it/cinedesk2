import { useMemo, useState } from "react";
import { Printer, Copy } from "lucide-react";
import { breakdown, eighths, shootingOrder } from "../lib/screenplay";

const TABS = ["Personnages", "Décors", "Accessoires", "Plan de tournage", "Feuille de service"];
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500";
const td = "px-3 py-2 text-[13px] text-neutral-200";
const Table = ({ head, rows }) => (
  <table className="w-full overflow-hidden clay-card">
    <thead className="bg-[var(--soft2)]"><tr>{head.map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-[var(--soft)]">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={td}>{c}</td>)}</tr>)}</tbody>
  </table>
);

export default function Breakdown({ scenes }) {
  const B = useMemo(() => breakdown(scenes), [scenes]);
  const order = useMemo(() => shootingOrder(scenes), [scenes]);
  const [tab, setTab] = useState(TABS[0]);
  const [sheet, setSheet] = useState({ date: "", place: "", call: "07:00", note: "", sel: new Set(scenes.slice(0, 2).map(s => s.id)) });
  const chosen = scenes.filter(s => sheet.sel.has(s.id));
  const cast = [...new Set(chosen.flatMap(s => [...s.chars.keys()]))];
  const props = [...new Set(chosen.flatMap(s => [...s.props]))];
  const toggle = id => setSheet(s => { const n = new Set(s.sel); n.has(id) ? n.delete(id) : n.add(id); return { ...s, sel: n }; });
  const csv = () => navigator.clipboard.writeText(["Type;Nom;Scènes", ...B.characters.map(c => `Personnage;${c.name};${c.scenes.join(",")}`),
    ...B.locations.map(l => `Décor;${l.name};${l.scenes.join(",")}`), ...B.props.map(p => `Accessoire;${p.name};${p.scenes.join(",")}`)].join("\n"));

  return (
    <div className="p-6">
      <style>{`@media print{body *{visibility:hidden}.print-area,.print-area *{visibility:visible}.print-area{position:absolute;left:0;top:0;width:100%;background:#fff;color:#000;padding:24px}}`}</style>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs ${tab === t ? "clay-solid clay-sky" : "clay-chip"}`}>{t}</button>)}
        <div className="flex-1" />
        <span className="text-xs text-neutral-500">{scenes.length} scènes · {B.pages} pages · ≈ {B.minutes} min</span>
        <button onClick={csv} className="flex items-center gap-1 rounded clay-btn px-2.5 py-1 text-xs"><Copy size={12} />Copier en CSV</button>
      </div>

      {tab === "Personnages" && <Table head={["Personnage", "Scènes", "Répliques", "Mots"]} rows={B.characters.map(c => [c.name, c.scenes.join(", "), c.lines, c.words])} />}
      {tab === "Décors" && <Table head={["Décor", "I/E", "Moments", "Scènes", "Longueur"]} rows={B.locations.map(l => [l.name, l.ie, [...l.times].join(", ") || "-", l.scenes.join(", "), eighths(l.eighths) + " p."])} />}
      {tab === "Accessoires" && <Table head={["Accessoire", "Scènes", "Occurrences"]} rows={B.props.map(p => [p.name, p.scenes.join(", "), p.scenes.length])} />}
      {tab === "Plan de tournage" && (
        <>
          <p className="mb-3 text-xs text-neutral-500">Ordre proposé : regroupé par décor, scènes de jour avant les scènes de nuit, pour limiter les déplacements.</p>
          <Table head={["#", "Scène", "Décor", "Moment", "Pages", "Personnages"]} rows={order.map((s, i) => [i + 1, s.id, s.location, s.time || "-", eighths(s.eighths), [...s.chars.keys()].join(", ")])} />
        </>
      )}
      {tab === "Feuille de service" && (
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <div className="space-y-3 text-xs">
            {[["date", "Date de tournage", "date"], ["place", "Lieu / adresse", "text"], ["call", "Convocation générale", "time"]].map(([k, l, t]) => (
              <label key={k} className="block text-neutral-400">{l}<input type={t} value={sheet[k]} onChange={e => setSheet(s => ({ ...s, [k]: e.target.value }))} className="mt-1 block w-full clay-well px-2 py-1.5 text-ink outline-none" /></label>
            ))}
            <label className="block text-neutral-400">Notes<textarea rows={3} value={sheet.note} onChange={e => setSheet(s => ({ ...s, note: e.target.value }))} className="mt-1 block w-full clay-well px-2 py-1.5 text-ink outline-none" /></label>
            <div className="text-neutral-400">Scènes du jour</div>
            <div className="max-h-56 space-y-1 overflow-auto">{scenes.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-neutral-300"><input type="checkbox" checked={sheet.sel.has(s.id)} onChange={() => toggle(s.id)} />{s.id}. {s.heading}</label>))}</div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 clay-solid clay-sky px-3 py-1.5"><Printer size={13} />Imprimer / PDF</button>
          </div>
          <div className="print-area rounded-lg bg-[#ffffff] p-8 text-[#000000] shadow-xl">
            <h2 className="text-xl font-bold">FEUILLE DE SERVICE</h2>
            <p className="mb-4 text-sm">{sheet.date || "Date à définir"} · {sheet.place || "Lieu à définir"} · Convocation {sheet.call}</p>
            <h3 className="mb-1 text-sm font-bold">Séquences</h3>
            <table className="mb-4 w-full text-xs"><tbody>{chosen.map(s => <tr key={s.id} className="border-b"><td className="py-1 pr-2">{s.id}</td><td>{s.heading}</td><td>{eighths(s.eighths)} p.</td><td>{[...s.chars.keys()].join(", ")}</td></tr>)}</tbody></table>
            <h3 className="mb-1 text-sm font-bold">Distribution</h3><p className="mb-4 text-xs">{cast.join(" · ") || "-"}</p>
            <h3 className="mb-1 text-sm font-bold">Accessoires</h3><p className="mb-4 text-xs">{props.join(" · ") || "-"}</p>
            {sheet.note && <><h3 className="mb-1 text-sm font-bold">Notes</h3><p className="whitespace-pre-wrap text-xs">{sheet.note}</p></>}
          </div>
        </div>
      )}
    </div>
  );
}
