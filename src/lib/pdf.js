/* Export PDF aux normes : Hollywood (US Letter) ou CNC/France (A4). Courier 12 pt, 6 lignes/pouce. */
import { jsPDF } from "jspdf";

export function screenplayPdf(lines, meta = {}, fmt = "hollywood") {
  const doc = new jsPDF({ unit: "pt", format: fmt === "cnc" ? "a4" : "letter" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const LH = 12, TOP = 72, BOTTOM = 72, L = 108, R = W - 72;
  const maxRows = Math.floor((H - TOP - BOTTOM) / LH);
  const spec = {
    heading: { x: L, w: R - L, before: 2, bold: true, upper: true },
    action: { x: L, w: R - L, before: 1 },
    character: { x: 266, w: R - 266, before: 1, upper: true },
    parenthetical: { x: 223, w: 144, before: 0 },
    dialogue: { x: 180, w: 238, before: 0 },
    transition: { x: L, w: R - L, before: 1, upper: true, right: true },
  };
  doc.setFont("courier", "normal"); doc.setFontSize(12);

  if (meta.title) {                                   // page de titre
    doc.setFont("courier", "bold");
    doc.text(doc.splitTextToSize(meta.title.toUpperCase(), R - L), W / 2, H / 3, { align: "center" });
    doc.setFont("courier", "normal");
    if (meta.author) { doc.text("écrit par", W / 2, H / 3 + 60, { align: "center" }); doc.text(meta.author, W / 2, H / 3 + 84, { align: "center" }); }
    if (meta.contact) doc.text(doc.splitTextToSize(meta.contact, 220), L, H - 130);
    doc.addPage();
  }

  let page = 1, row = 0;
  const newPage = () => { doc.addPage(); page++; row = 0; doc.setFont("courier", "normal"); doc.text(`${page}.`, R, 48, { align: "right" }); };

  lines.forEach(l => {
    const raw = (l.text || "").trim();
    if (!raw) return;
    const s = spec[l.type] || spec.action;
    const text = s.upper ? raw.toUpperCase() : l.type === "parenthetical" && !raw.startsWith("(") ? `(${raw})` : raw;
    doc.setFont("courier", s.bold ? "bold" : "normal");
    const wrapped = doc.splitTextToSize(text, s.w);
    let need = (row === 0 ? 0 : s.before) + wrapped.length;
    if (l.type === "character") need += 2;            // ne jamais isoler un nom en bas de page
    if (l.type === "heading") need += 3;              // ni un en-tête de séquence
    if (row > 0 && row + need > maxRows) newPage();
    if (row > 0) row += s.before;
    wrapped.forEach(w => {
      if (row >= maxRows) newPage();
      const y = TOP + (row + 1) * LH;
      doc.setFont("courier", s.bold ? "bold" : "normal");
      s.right ? doc.text(w, R, y, { align: "right" }) : doc.text(w, s.x, y);
      row++;
    });
  });
  return doc.output("arraybuffer");
}
