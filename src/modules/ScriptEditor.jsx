import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { Pin } from "lucide-react";
import { TYPES } from "../lib/formats";
import { parseText } from "../lib/importer";
import { SEV_COLOR } from "./TensionChart";
import { SewnButton } from "./Craft";

const NEXT_ENTER = { heading: "action", action: "action", character: "dialogue", dialogue: "action", parenthetical: "dialogue", transition: "heading" };
const NEXT_TAB = { action: "character", character: "dialogue", dialogue: "character", heading: "action", parenthetical: "dialogue", transition: "heading" };
const UPPER = new Set(["heading", "character", "transition"]);
const HEADING = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.|EXT\.)\s/i;
const LABEL = { heading: "Scène", action: "Action", character: "Personnage", parenthetical: "Parenthèse", dialogue: "Dialogue", transition: "Transition" };
const style = {
  heading: "font-bold mt-6", action: "mt-3", character: "ml-[38%] mt-4",
  parenthetical: "ml-[30%] mr-[25%] italic", dialogue: "ml-[22%] mr-[18%]", transition: "text-right mt-4",
};

function Area({ value, refCb, className, ...rest }) {
  const el = useRef(null);
  useLayoutEffect(() => { const e = el.current; if (e) { e.style.height = "auto"; e.style.height = e.scrollHeight + "px"; } }, [value]);
  return (
    <textarea ref={e => { el.current = e; refCb(e); }} rows={1} value={value} spellCheck
      className={`block w-full resize-none overflow-hidden bg-transparent text-neutral-100 outline-none placeholder:text-neutral-700 ${className}`} {...rest} />
  );
}

const RANK = { high: 3, mid: 2, low: 1 };

export default function ScriptEditor({ lines, setLines, meta, setMeta, jumpTo, onShowNote, flags = {}, onOpenFlaw }) {
  const [hoverFlag, setHoverFlag] = useState(null);
  const refs = useRef([]);
  const [focus, setFocus] = useState(null);

  useLayoutEffect(() => {
    if (!focus) return;
    const el = refs.current[focus.i];
    if (el) {
      el.focus();
      const p = focus.pos ?? el.value.length;
      el.setSelectionRange(p, p);
      if (focus.scroll) el.scrollIntoView({ block: "center" });
    }
    setFocus(null);
  }, [focus]);
  useEffect(() => { if (jumpTo) setFocus({ i: jumpTo.i, pos: 0, scroll: true }); }, [jumpTo]);

  const names = useMemo(() => [...new Set(lines.filter(l => l.type === "character")
    .map(l => l.text.replace(/\s*\(.*?\)\s*$/, "").trim().toUpperCase()).filter(Boolean))], [lines]);
  const sceneNo = useMemo(() => { let n = 0; return lines.map(l => (l.type === "heading" ? ++n : 0)); }, [lines]);

  const patch = (i, p) => setLines(ls => ls.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const suggest = i => {
    const l = lines[i];
    if (l.type !== "character" || !l.text) return null;
    const up = l.text.toUpperCase();
    return names.find(n => n.startsWith(up) && n !== up) || null;
  };

  const onChange = (i, text) => {
    const l = lines[i];
    patch(i, { text, type: HEADING.test(text) && l.type !== "heading" ? "heading" : l.type });
  };

  const onKeyDown = (e, i) => {
    const el = e.target, l = lines[i], pos = el.selectionStart, end = el.selectionEnd;
    const collapsed = pos === end, atEnd = collapsed && pos === el.value.length;
    if (e.metaKey || e.ctrlKey) {
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); patch(i, { type: TYPES[+e.key - 1] }); }
      return;                                           // ⌘Z, ⌘S… gérés au niveau de l'application
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!l.text.trim()) { if (l.type !== "action") patch(i, { type: "action" }); return; }
      const left = l.text.slice(0, pos), right = l.text.slice(end);
      const type = right ? (l.type === "heading" ? "action" : l.type) : NEXT_ENTER[l.type];
      setLines(ls => [...ls.slice(0, i), { ...l, text: left }, { type, text: right }, ...ls.slice(i + 1)]);
      setFocus({ i: i + 1, pos: 0 });
    } else if (e.key === "Tab") {
      e.preventDefault();
      const s = suggest(i);
      if (s) patch(i, { text: s });
      else patch(i, { type: e.shiftKey ? "action" : NEXT_TAB[l.type] });
    } else if (e.key === "Backspace" && pos === 0 && end === 0 && i > 0) {
      e.preventDefault();
      const prev = lines[i - 1];
      if (!l.text) { setLines(ls => ls.filter((_, k) => k !== i)); setFocus({ i: i - 1 }); }
      else {
        const base = prev.text ? prev : l;
        const joined = prev.text ? prev.text + " " + l.text : l.text;
        setLines(ls => [...ls.slice(0, i - 1), { ...base, text: joined }, ...ls.slice(i + 1)]);
        setFocus({ i: i - 1, pos: prev.text ? prev.text.length + 1 : 0 });
      }
    } else if (e.key === "ArrowUp" && pos === 0 && collapsed && i > 0) { e.preventDefault(); setFocus({ i: i - 1 }); }
    else if (e.key === "ArrowDown" && atEnd && i < lines.length - 1) { e.preventDefault(); setFocus({ i: i + 1, pos: 0 }); }
  };

  const onPaste = (e, i) => {                          // texte collé sur plusieurs lignes → reclassé automatiquement
    const t = e.clipboardData.getData("text");
    if (!t.includes("\n")) return;
    e.preventDefault();
    const parsed = parseText(t);
    setLines(ls => ls.slice(0, ls[i].text.trim() ? i + 1 : i).concat(parsed, ls.slice(i + 1)));
  };

  const field = (k, ph) => (
    <input value={meta[k] || ""} placeholder={ph} onChange={e => setMeta(m => ({ ...m, [k]: e.target.value }))}
      className="clay-well px-3 py-1.5 text-xs text-ink outline-none placeholder:text-ink-mute" />
  );

  return (
    <div className="mx-auto my-6 max-w-[800px] px-4">
      <div className="mb-3 grid grid-cols-3 gap-2">{field("title", "Titre")}{field("author", "Auteur·rice")}{field("contact", "Contact")}</div>
      <div className="clay-paper clay-stitch relative px-16 py-12" 
           style={{ fontFamily: "'Courier Prime','Courier New',Courier,monospace", fontSize: "12pt", lineHeight: 1.5, "--stitch": "rgba(205,160,100,.7)", "--r": "30px" }}>
        <SewnButton size={30} color="#ff7a59" className="paper-pin pointer-events-none absolute -top-3 left-14" />
        <SewnButton size={30} color="#3aa6ff" holes={2} className="paper-pin pointer-events-none absolute -top-3 right-14" />
        {lines.map((l, i) => {
          const sug = suggest(i);
          const fl = flags[i];
          const worst = fl ? fl.reduce((a, f) => (RANK[f.severity] > RANK[a] ? f.severity : a), "low") : null;
          return (
            <div key={i} className="group relative" style={fl ? { borderLeft: `5px solid ${SEV_COLOR[worst]}`, paddingLeft: 8, marginLeft: -13, borderRadius: 8 } : undefined}>
              {fl && (
                <div className="absolute -right-4 top-1 z-20" onMouseEnter={() => setHoverFlag(i)} onMouseLeave={() => setHoverFlag(null)}>
                  <button onClick={() => onOpenFlaw?.(fl[0].id)} className="block h-4 w-4 rotate-45 rounded-[4px] border-2 border-white shadow" style={{ background: SEV_COLOR[worst] }} aria-label="Remarque du Script Doctor" />
                  {hoverFlag === i && (
                    <div className="absolute right-0 top-6 z-30 w-72 clay-card p-3 text-left text-xs leading-snug text-ink-soft" style={{ fontFamily: "system-ui" }}>
                      {fl.slice(0, 3).map(f => <div key={f.id} className="mb-2 last:mb-0"><div className="font-extrabold text-ink">{f.title}</div><div>{f.why}</div></div>)}
                      <div className="mt-1 text-[10px] text-ink-mute">Cliquez pour ouvrir l'analyse</div>
                    </div>
                  )}
                </div>
              )}
              {l.type === "heading" && <span className="absolute -left-10 top-6 w-8 text-right text-[10px] text-neutral-600" style={{ fontFamily: "system-ui" }}>{sceneNo[i]}</span>}
              {l.type === "heading" && l.text && (
                <button title="Voir le post-it de cette scène" onClick={() => onShowNote(l.text)}
                  className="absolute -right-9 top-6 rounded p-1 text-neutral-500 opacity-0 hover:clay-btn group-hover:opacity-100"><Pin size={13} /></button>
              )}
              <Area value={l.text} refCb={el => (refs.current[i] = el)} placeholder={LABEL[l.type]}
                className={`${style[l.type]} ${UPPER.has(l.type) ? "uppercase" : ""}`}
                onChange={e => onChange(i, e.target.value)} onKeyDown={e => onKeyDown(e, i)} onPaste={e => onPaste(e, i)} />
              {sug && <div className="absolute left-[38%] top-full z-10 clay-chip px-2 py-0.5 text-[11px] text-ink" style={{ fontFamily: "system-ui" }}>↹ {sug}</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[11px] text-neutral-500">
        Entrée : élément suivant · Tab : Personnage ⇄ Dialogue (ou compléter un nom) · ⌘1–6 : choisir l'élément · ⌘Z : annuler
      </p>
    </div>
  );
}
