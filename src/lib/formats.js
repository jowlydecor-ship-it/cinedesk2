/* Import / export : Fountain (.fountain/.txt), Final Draft (.fdx) */
export const TYPES = ["heading", "action", "character", "parenthetical", "dialogue", "transition"];
const HEADING = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|I\/E\.?)[\s.]/i;

export function fromFountain(src, { titlePage = true } = {}) {
  const rows = src.replace(/\r/g, "").replace(/^\uFEFF/, "").split("\n");
  const meta = {};
  let i = 0;
  if (titlePage && /^[A-Za-z ]+:/.test(rows[0] || "")) {
    for (; i < rows.length && rows[i].trim() !== ""; i++) {
      const m = rows[i].match(/^([A-Za-z ]+):\s*(.*)$/);
      if (m) meta[m[1].trim().toLowerCase()] = m[2].trim();
    }
  }
  const out = [];
  let prevBlank = true, inDialogue = false;
  for (; i < rows.length; i++) {
    const t = rows[i].trim();
    if (!t) { inDialogue = false; prevBlank = true; continue; }
    if (/^\[\[.*\]\]$/.test(t) || /^={3,}$/.test(t) || t.startsWith("#") || t.startsWith("=")) continue;
    if (inDialogue) {
      out.push({ type: /^\(.*\)$/.test(t) ? "parenthetical" : "dialogue", text: t });
      prevBlank = false; continue;
    }
    const nextFilled = !!rows[i + 1]?.trim();
    const name = t.replace(/^@/, "").replace(/\s*\(.*?\)\s*$/, "");
    if (prevBlank && (HEADING.test(t) || /^\.[^.]/.test(t))) {
      out.push({ type: "heading", text: t.replace(/^\./, "").replace(/\s*#.*#\s*$/, "").toUpperCase() });
    } else if (/^>[^<]*$/.test(t) || (prevBlank && /TO:$/.test(t) && t === t.toUpperCase())) {
      out.push({ type: "transition", text: t.replace(/^>\s*/, "").toUpperCase() });
    } else if (prevBlank && nextFilled && name === name.toUpperCase() && /\p{L}/u.test(name)) {
      out.push({ type: "character", text: t.replace(/^@/, "").toUpperCase() });
      inDialogue = true;
    } else if (!prevBlank && out.at(-1)?.type === "action") {
      out[out.length - 1].text += " " + t.replace(/^!/, "");
    } else out.push({ type: "action", text: t.replace(/^!/, "") });
    prevBlank = false;
  }
  return { lines: out.length ? out : [{ type: "action", text: "" }], meta };
}

export function toFountain(lines, meta = {}) {
  const head = [["Title", meta.title], ["Author", meta.author], ["Contact", meta.contact]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const body = [];
  lines.forEach(l => {
    const t = (l.text || "").trim();
    if (!t) return;
    switch (l.type) {
      case "heading": body.push("", HEADING.test(t + " ") ? t.toUpperCase() : "." + t.toUpperCase()); break;
      case "character": body.push("", t.toUpperCase()); break;
      case "transition": body.push("", "> " + t.toUpperCase()); break;
      case "parenthetical": body.push(t.startsWith("(") ? t : `(${t})`); break;
      case "dialogue": body.push(t); break;
      default: body.push("", t);
    }
  });
  return (head ? head + "\n\n" : "") + body.join("\n").replace(/^\n+/, "") + "\n";
}

const FDX = { heading: "Scene Heading", action: "Action", character: "Character", parenthetical: "Parenthetical", dialogue: "Dialogue", transition: "Transition" };
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const toFdx = lines =>
  `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<FinalDraft DocumentType="Script" Template="No" Version="2">\n  <Content>\n` +
  lines.filter(l => l.text.trim()).map(l => `    <Paragraph Type="${FDX[l.type] || "Action"}"><Text>${esc(l.text)}</Text></Paragraph>`).join("\n") +
  `\n  </Content>\n</FinalDraft>\n`;

export function fromFdx(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Fichier FDX invalide");
  const rev = Object.fromEntries(Object.entries(FDX).map(([k, v]) => [v, k]));
  const lines = [...doc.querySelectorAll("Content > Paragraph")]
    .map(p => ({ type: rev[p.getAttribute("Type")] || "action", text: [...p.querySelectorAll("Text")].map(t => t.textContent).join("") }))
    .filter(l => l.text.trim());
  if (!lines.length) throw new Error("Aucun contenu dans ce fichier FDX");
  return { lines, meta: {} };
}
