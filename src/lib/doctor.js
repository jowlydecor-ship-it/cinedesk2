/* Script Doctor – moteur d'analyse 100 % local, déterministe et EXPLICABLE :
   chaque valeur de tension et chaque faille s'accompagne de sa justification chiffrée. */
import { words, breakdown, eighths, SIGNIFICANT_RE } from "./screenplay.js";
import { runtimeOf, insights, fmtDur, findAntagonist, WANT_RE } from "./insights.js";

export const fmt = v => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
const tok = s => s.toLowerCase().match(/[\p{L}'’-]+/gu) || [];
const W = s => new Set(s.split(" "));
const CONFLICT = W("tue tuer tuez tué tuent meurs meurtre mort morte mourir sang arme armes revolver pistolet fusil couteau danger feu explosion panique peur cri crie crier hurle hurler fuite fuis fuir menace menaces trahi trahis trahison mensonge menti mens ment haine colère jamais stop non arrête lâche salaud secours attention vite tais-toi coupable prison police");
const ACTION = W("court courent frappe frappent saisit braque tire tirent claque jette pousse attrape bondit plonge fonce s'enfuit arrache brise casse tombe saute poursuit étrangle cogne gifle recule s'écrase glisse");
const EXPO = /comme tu (le )?sais|tu te (souviens|rappelles)|je t['’](ai déjà )?(dit|expliqué)|rappelle-toi|comme je te disais|vous savez (très )?bien que|ça fait (\d+|dix|vingt|trente) ans que/i;
const NOSE = /\bje (suis|me sens|ressens) (tellement |très |si )?(triste|en colère|heureu[xs]e?|jaloux|jalouse|seul|seule|désespéré|angoissé)|\bj['’]ai (très |tellement )?(peur|honte)\b|\bje t['’]aime\b|\bje te déteste\b|\bje suis (furieux|furieuse)\b/i;

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const stdev = a => { const m = a.reduce((x, y) => x + y, 0) / (a.length || 1); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length || 1)); };
const jaccard = (a, b) => {
  const A = new Set(a.toLowerCase().match(/[\p{L}]{3,}/gu) || []), B = new Set(b.toLowerCase().match(/[\p{L}]{3,}/gu) || []);
  if (!A.size || !B.size) return 0;
  let i = 0; A.forEach(x => B.has(x) && i++);
  return i / (A.size + B.size - i);
};
const pct = (id, n) => Math.round(((id - 1) / Math.max(1, n - 1)) * 100);
const list = ids => ids.length > 3 ? `${ids[0]} à ${ids.at(-1)}` : ids.join(", ");

/* ── facteurs de tension d'une scène ── */
function factorsOf(s, ctx) {
  const text = s.lines.map(l => l.text).join(" ");
  const f = [];
  const add = (key, label, points, detail) => points > 0 && f.push({ key, label, points: Math.round(points * 10) / 10, detail });
  const hits = tok(text).filter(t => CONFLICT.has(t));
  add("conflict", "Mots de conflit", Math.min(12, hits.length * 1.5), `${hits.length} : ${[...new Set(hits)].slice(0, 4).map(h => `« ${h} »`).join(", ")}`);
  const ex = (text.match(/!/g) || []).length; add("excl", "Exclamations", Math.min(8, ex * 1.2), `${ex} point(s) d'exclamation`);
  const q = (text.match(/\?/g) || []).length; add("quest", "Interrogations", Math.min(4, q * 0.4), `${q} question(s)`);
  let short = 0, run = 0, best = 0;
  s.lines.filter(l => l.type === "dialogue").forEach(l => { if (words(l.text) <= 4) { short++; best = Math.max(best, ++run); } else run = 0; });
  add("rapid", "Échanges rapides", Math.min(8, short * 0.8) + (best >= 4 ? 2 : 0), `${short} réplique(s) de 4 mots ou moins${best >= 4 ? `, dont ${best} d'affilée` : ""}`);
  const av = tok(s.lines.filter(l => l.type === "action").map(l => l.text).join(" ")).filter(t => ACTION.has(t));
  add("move", "Action physique", Math.min(8, av.length), `${av.length} verbe(s) : ${[...new Set(av)].slice(0, 3).join(", ")}`);
  const sig = [...s.props].filter(p => SIGNIFICANT_RE.test(p));
  add("stakes", "Objet à enjeu", Math.min(6, sig.length * 3), sig.join(", "));
  const newC = [...s.chars.keys()].filter(c => !ctx.chars.has(c)), newL = !ctx.locs.has(s.location);
  add("novelty", "Nouveauté", newC.length * 1.5 + (newL ? 1 : 0), [newC.length ? `nouveau personnage : ${newC.join(", ")}` : "", newL ? "nouveau décor" : ""].filter(Boolean).join(" ; "));
  add("night", "Ambiance nocturne", /NUIT|SOIR/.test(s.time) ? 1 : 0, "scène de nuit");
  add("duel", "Affrontement dialogué", s.chars.size >= 2 && s.turns >= 6 ? 2 : 0, `${s.chars.size} personnages, ${s.turns} prises de parole`);
  newC.forEach(c => ctx.chars.add(c)); ctx.locs.add(s.location);
  return { f: f.sort((a, b) => b.points - a.points), words: words(text) };
}

export function analyze(scenes, notes = [], acts = []) {
  const n = scenes.length;
  const B = breakdown(scenes);
  const rt = runtimeOf(scenes);
  const ctx = { chars: new Set(), locs: new Set() };

  /* ── courbe de tension expliquée ── */
  const raw = scenes.map(s => {
    const { f, words: w } = factorsOf(s, ctx);
    const total = f.reduce((a, x) => a + x.points, 0), damp = Math.max(1, Math.sqrt(w / 60));
    return { f, total, damp, score: total / damp };
  });
  const lo = Math.min(...raw.map(r => r.score)), hi = Math.max(...raw.map(r => r.score));
  const vals = raw.map(r => (hi === lo ? 5 : Math.round(((r.score - lo) / (hi - lo)) * 100) / 10));
  const med = median(vals), sd = stdev(vals);

  const peaks = [], valleys = [];
  vals.forEach((v, i) => {
    const p = i > 0 ? vals[i - 1] : -1, nx = i < n - 1 ? vals[i + 1] : -1;
    if (v >= 6 && v > p && v >= nx) peaks.push(i);
    const p2 = i > 0 ? vals[i - 1] : 99, n2 = i < n - 1 ? vals[i + 1] : 99;
    if (n >= 5 && v <= 3.5 && v < p2 && v <= n2) valleys.push(i);
  });

  const infos = scenes.map((s, i) => {
    const r = raw[i], v = vals[i];
    const level = v >= 7.5 ? "très élevée" : v >= 5.5 ? "élevée" : v >= 3.5 ? "moyenne" : "basse";
    const top = r.f.slice(0, 3);
    let summary = top.length
      ? `Tension ${level} (${fmt(v)}/10), ${v >= 5.5 ? "principalement due à" : "marqueurs relevés"} : ${top.map(x => `${x.label.toLowerCase()} (${x.detail})`).join(" ; ")}.`
      : `Tension ${level} (${fmt(v)}/10) : aucun marqueur de conflit détecté, scène d'exposition ou de respiration.`;
    if (r.damp > 1.05) summary += ` Valeur pondérée par la longueur de la scène (÷ ${fmt(r.damp)}).`;
    let trend = "";
    if (i > 0 && Math.abs(v - vals[i - 1]) >= 2) {
      const prev = Object.fromEntries(raw[i - 1].f.map(x => [x.key, x.points]));
      const cur = Object.fromEntries(r.f.map(x => [x.key, x.points]));
      const keys = [...new Set([...Object.keys(prev), ...Object.keys(cur)])];
      const dk = keys.map(k => [k, (cur[k] || 0) - (prev[k] || 0)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      const label = [...raw[i].f, ...raw[i - 1].f].find(x => x.key === dk?.[0])?.label.toLowerCase();
      trend = `${v > vals[i - 1] ? "Hausse" : "Baisse"} de ${fmt(Math.abs(v - vals[i - 1]))} point(s) par rapport à la scène ${i}${label ? ` : ${label} ${dk[1] > 0 ? "en plus" : "en moins"}` : ""}.`;
    }
    return { id: s.id, heading: s.heading, minute: rt.start[i], value: v, factors: r.f, summary, trend, role: peaks.includes(i) ? "pic" : valleys.includes(i) ? "creux" : "" };
  });

  /* ── structure : points de bascule attendus ── */
  const BEATS = [["Incident incitateur", 0.12, 0.08, false, "Incident"], ["Premier tournant", 0.25, 0.1, true, "Pivot 1"], ["Point médian", 0.5, 0.1, false, "Milieu"], ["Crise (tout est perdu)", 0.75, 0.1, true, "Crise"], ["Climax", 0.9, 0.12, true, "Climax"]];
  const beats = n < 6 ? [] : BEATS.map(([name, at, tol, strict, short]) => {
    const idx = vals.map((v, i) => i).filter(i => Math.abs(i / (n - 1) - at) <= tol);
    const best = idx.sort((a, b) => vals[b] - vals[a])[0] ?? Math.round(at * (n - 1));
    const need = Math.max(5.5, med + 0.6 * sd);
    const found = vals[best] >= need;
    return { name, short, at: Math.round(at * 100), strict, scene: best + 1, minute: rt.start[best] ?? 0, value: vals[best], found,
      why: found ? `Scène ${best + 1} (${pct(best + 1, n)} %) : tension ${fmt(vals[best])}/10, au-dessus du seuil ${fmt(need)}.`
        : `Autour de ${Math.round(at * 100)} % (scènes ${idx.length ? list(idx.map(i => i + 1)) : best + 1}), le plus fort moment n'atteint que ${fmt(vals[best])}/10 (seuil ${fmt(need)}, médiane ${fmt(med)}).` };
  });

  /* ── failles ── */
  const flaws = [], strengths = [];
  const add = (severity, kind, title, text, why, fix, ids = [], lines = []) =>
    flaws.push({ id: flaws.length, severity, kind, title, text, why, fix, scenes: ids, lines: [...new Set(lines)].slice(0, 12) });
  const startOf = ids => ids.map(id => scenes[id - 1].start);

  if (n >= 5) {
    let run = [];
    const flush = () => {
      if (run.length >= 3) {
        const ids = run.map(i => i + 1), e8 = run.reduce((a, i) => a + scenes[i].eighths, 0);
        const cw = run.reduce((a, i) => a + (infos[i].factors.find(x => x.key === "conflict") ? 1 : 0), 0);
        add("mid", "slump", "Ventre mou probable", `Scènes ${list(ids)} : tension sous la médiane, sans apport narratif.`,
          `Tensions ${run.map(i => fmt(vals[i])).join(" / ")} pour une médiane de ${fmt(med)}. Aucun nouveau personnage ni nouveau décor, ${cw} scène(s) avec des marqueurs de conflit sur ${ids.length}, soit ${eighths(e8)} page(s) sans enjeu nouveau.`,
          "Faites monter un enjeu (compte à rebours, révélation, obstacle) ou fusionnez deux de ces scènes pour resserrer le rythme.", ids, startOf(ids));
      }
      run = [];
    };
    scenes.forEach((s, i) => { if (vals[i] <= med && !infos[i].factors.some(x => x.key === "novelty")) run.push(i); else flush(); });
    flush();

    const med8 = median(scenes.map(s => s.eighths));
    scenes.forEach((s, i) => { if (s.eighths > Math.max(med8 * 2.2, 12))
      add("low", "long", "Scène très longue", `La scène ${s.id} (${s.heading}) est plus du double de la médiane.`,
        `${eighths(s.eighths)} page(s) contre une médiane de ${eighths(med8)}, pour une tension de ${fmt(vals[i])}/10 : la scène s'étire par rapport à son enjeu.`,
        "Commencez la scène au dernier moment utile et sortez-en plus tôt.", [s.id], [s.start]); });
  }

  /* structure */
  beats.filter(b => b.strict && !b.found).forEach(b => add(b.name === "Climax" ? "high" : "mid", "beat", `${b.name} peu marqué`,
    `Pas de pic de tension net autour de ${b.at} % du récit.`, b.why,
    b.name === "Climax" ? "Faites converger les enjeux dans une confrontation plus intense, avec un coût réel pour le héros." : "Terminez l'acte par une rupture claire : révélation, perte, choix irréversible.", [b.scene], [scenes[b.scene - 1].start]));
  if (n >= 8) {
    const top = vals.indexOf(Math.max(...vals));
    if (top / (n - 1) < 0.6) add("mid", "early", "Point culminant trop tôt", `La scène la plus intense est la scène ${top + 1}.`,
      `Elle se situe à ${pct(top + 1, n)} % du récit avec ${fmt(vals[top])}/10 : tout ce qui suit est moins intense, la fin risque de retomber.`,
      "Gardez une marche d'escalade pour le dernier acte ou renforcez la confrontation finale.", [top + 1], [scenes[top].start]);
  }

  /* équilibre des actes (mur de post-it) */
  if (acts.length && notes.length >= 6) {
    const by = Object.fromEntries(acts.map(a => [a, { n: 0, e: 0 }]));
    notes.forEach(nt => { const s = scenes.find(x => x.heading === nt.heading); if (by[nt.act]) { by[nt.act].n++; by[nt.act].e += s ? s.eighths : 0; } });
    const totE = Object.values(by).reduce((a, x) => a + x.e, 0) || 1;
    let ok = true;
    acts.forEach(a => {
      const sh = by[a].n / notes.length, ps = by[a].e / totE;
      if (sh > 0.4 || ps > 0.45) { ok = false; add("mid", "act", `${a} surdimensionné`, `${a} concentre ${Math.round(sh * 100)} % des scènes du mur.`,
        `${by[a].n} scène(s) sur ${notes.length} (${Math.round(sh * 100)} %), environ ${Math.round(ps * 100)} % des pages. Repère habituel : 15 à 35 % par acte.`,
        `Déplacez ou condensez une scène de ${a} ; vérifiez qu'un vrai point de bascule la termine.`); }
      if (sh < 0.1) { ok = false; add("mid", "act", `${a} sous-développé`, `${a} ne représente que ${Math.round(sh * 100)} % des scènes du mur.`,
        `${by[a].n} scène(s) sur ${notes.length}. Un acte aussi court ne peut pas porter son rôle dans la progression dramatique.`, `Ajoutez un obstacle ou une conséquence dans ${a}.`); }
    });
    if (ok) strengths.push("Les actes du mur de post-it sont équilibrés (aucun acte au-delà de 40 % des scènes ni sous 10 %).");
  }

  /* fusils de Tchekhov */
  const sig = B.props.filter(p => SIGNIFICANT_RE.test(p.name));
  let paid = 0;
  sig.forEach(p => {
    const first = p.scenes[0], last = p.scenes.at(-1), at = scenes[first - 1].propAt[p.name] || [];
    if (n >= 4 && p.scenes.length === 1 && (first - 1) / (n - 1) < 0.75)
      add("high", "chekhov", `« ${p.name} » jamais réutilisé`, `L'objet « ${p.name} » apparaît en scène ${first} puis disparaît.`,
        `Unique apparition en scène ${first} (${pct(first, n)} % du récit), aucune reprise sur les ${n - first} scène(s) suivantes. Un objet important sans retour crée une attente que le spectateur n'obtient jamais.`,
        `Donnez-lui un payoff avant la fin (utilisation, perte, révélation) ou retirez-le de la scène ${first}.`, [first], at);
    else if (n >= 4 && last !== first && (last - 1) / (n - 1) < 0.6)
      add("mid", "chekhov", `« ${p.name} » disparaît à mi-parcours`, `Dernière apparition en scène ${last}.`,
        `Présent en scènes ${p.scenes.join(", ")}, puis absent des ${n - last} dernière(s) scène(s) (après ${pct(last, n)} % du récit).`,
        "Rappelez l'objet dans le dernier acte pour boucler sa fonction dramatique.", [last], scenes[last - 1].propAt[p.name] || []);
    else if (n >= 4 && (first - 1) / (n - 1) > 0.8)
      add("mid", "chekhov", `« ${p.name} » surgit tardivement`, `Première apparition en scène ${first}.`,
        `Introduit à ${pct(first, n)} % du récit : risque de deus ex machina, le spectateur n'a pas pu l'anticiper.`, "Plantez-le plus tôt, discrètement, dans le premier tiers.", [first], at);
    else paid++;
  });
  if (sig.length && paid === sig.length) strengths.push(`Les ${sig.length} objet(s) importants (${sig.map(p => p.name).join(", ")}) sont plantés puis exploités.`);

  /* personnages */
  const prot = B.characters[0];
  if (prot && n >= 5) {
    const ids = new Set(prot.scenes);
    let gap = [];
    for (let i = 1; i <= n + 1; i++) {
      if (i <= n && !ids.has(i)) gap.push(i);
      else { if (gap.length >= 3) add("mid", "absent", `${prot.name} absent·e longtemps`, `Absent·e des scènes ${list(gap)}.`,
        `${prot.name} est le personnage principal (${prot.scenes.length}/${n} scènes, ${prot.words} mots) mais disparaît pendant ${gap.length} scènes d'affilée (${pct(gap[0], n)} % à ${pct(gap.at(-1), n)} %).`,
        "Faites sentir sa présence (conséquences, regard d'un autre personnage) ou raccourcissez cette parenthèse.", [...gap], startOf(gap)); gap = []; }
    }
    if (prot.scenes.length / n >= 0.6) strengths.push(`${prot.name} porte le récit : présent·e dans ${Math.round((prot.scenes.length / n) * 100)} % des scènes.`);
    if ((prot.scenes[0] - 1) / (n - 1) > 0.15) add("mid", "late-hero", `${prot.name} arrive tard`, `Première apparition en scène ${prot.scenes[0]}.`,
      `À ${pct(prot.scenes[0], n)} % du récit : le spectateur attend trop longtemps son point de vue.`, "Faites apparaître le personnage principal (ou son absence) dès le premier acte.", [prot.scenes[0]], [scenes[prot.scenes[0] - 1].start]);
  }
  B.characters.forEach(c => {
    if (n >= 5 && c.lines >= 3 && (c.scenes[0] - 1) / (n - 1) > 0.7)
      add("mid", "late-char", `${c.name} introduit·e tard`, `Première apparition en scène ${c.scenes[0]}.`,
        `À ${pct(c.scenes[0], n)} % du récit, avec ${c.lines} répliques : sans ancrage préalable, l'émotion ne peut pas jouer.`, "Annoncez ce personnage plus tôt (mention, silhouette).", [c.scenes[0]], [scenes[c.scenes[0] - 1].start]);
    if (n >= 6 && c !== prot && c.scenes.length >= 3 && c.lines >= 3 && (c.scenes.at(-1) - 1) / (n - 1) < 0.55)
      add("low", "gone", `${c.name} disparaît`, `Dernière apparition en scène ${c.scenes.at(-1)}.`,
        `${c.name} apparaît dans ${c.scenes.length} scènes puis plus rien après ${pct(c.scenes.at(-1), n)} % du récit : son arc reste ouvert.`, "Concluez son arc (même brièvement) ou justifiez son absence.", [c.scenes.at(-1)], [scenes[c.scenes.at(-1) - 1].start]);
    if (c.scenes.length === 1 && c.words > 80)
      add("low", "talker", `${c.name} : personnage-fonction bavard`, `Présent dans une seule scène.`, `${c.words} mots de dialogue pour une unique apparition : il porte beaucoup d'information pour un rôle ponctuel.`,
        "Réduisez le texte ou donnez à ce personnage un écho ailleurs.", [c.scenes[0]], [scenes[c.scenes[0] - 1].start]);
  });

  /* dialogues */
  const expo = [], nose = [];
  scenes.forEach(s => {
    const d = s.lines.filter(l => l.type === "dialogue");
    d.forEach(l => { const w = words(l.text);
      if (w > 45) add("low", "tirade", "Tirade", `Réplique de ${w} mots en scène ${s.id}.`, `${w} mots : au-delà d'environ 40 mots, une réplique filmée devient un monologue qui arrête l'action.`,
        "Coupez en deux, intercalez une action ou une réaction, ou laissez l'image porter une partie du sens.", [s.id], [l.i]);
      if (EXPO.test(l.text)) expo.push(l.i);
      if (NOSE.test(l.text)) nose.push(l.i);
    });
    for (let i = 1; i < d.length; i++) { const j = jaccard(d[i - 1].text, d[i].text);
      if (j > 0.6) { add("low", "repeat", "Répétition dans le dialogue", `Deux répliques consécutives se ressemblent en scène ${s.id}.`,
        `Les deux répliques partagent ${Math.round(j * 100)} % de leur vocabulaire : le dialogue fait du surplace.`, "Supprimez l'une ou faites progresser l'échange (nouvelle information, nouvel enjeu).", [s.id], [d[i - 1].i, d[i].i]); break; } }
    const tot = s.dialogueWords + s.actionWords;
    if (tot > 120 && s.dialogueWords / tot > 0.85)
      add("low", "talky", "Scène bavarde", `La scène ${s.id} est quasi uniquement dialoguée.`, `${Math.round((s.dialogueWords / tot) * 100)} % de dialogue (${s.dialogueWords} mots contre ${s.actionWords} d'action) : peu de matière visuelle.`,
        "Ajoutez une action visuelle ou un sous-texte filmable pour éviter la scène « tête parlante ».", [s.id], [s.start]);
  });
  if (expo.length) add("low", "expo", "Dialogue d'exposition", `${expo.length} réplique(s) qui expliquent ce que les personnages savent déjà.`,
    "Formules du type « comme tu sais… » : le personnage ne parle pas à son interlocuteur mais au spectateur.", "Faites passer l'information par un conflit, une image ou une question que l'autre ignore vraiment.",
    [...new Set(expo.map(i => scenes.find(s => s.start <= i && i <= s.end)?.id).filter(Boolean))], expo);
  if (nose.length >= 2) add("low", "nose", "Dialogue « sur le nez »", `${nose.length} réplique(s) où un personnage nomme son émotion.`,
    "Les personnages disent ce qu'ils ressentent (« j'ai peur », « je t'aime »…) au lieu de le jouer : le sous-texte disparaît.", "Remplacez par une action, un silence ou une phrase qui dit autre chose que ce qu'elle ressent.",
    [...new Set(nose.map(i => scenes.find(s => s.start <= i && i <= s.end)?.id).filter(Boolean))], nose);

  /* escalade des enjeux et enchaînement causal (critères « enjeux » et « rythme ») */
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const trend = vals.map((_, i) => avg(vals.slice(Math.max(0, i - 1), i + 2)));
  let slope10 = 0;
  if (n >= 8) {
    const xs = [], ys = [];
    for (let i = Math.floor(n * 0.2); i < Math.ceil(n * 0.95); i++) { xs.push(i); ys.push(trend[i]); }
    const mx = avg(xs), my = avg(ys);
    slope10 = (xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0) / Math.max(1e-9, xs.reduce((a, x) => a + (x - mx) ** 2, 0))) * (n - 1) * 0.1;
    const third = k => avg(vals.slice(Math.floor((n * k) / 3), Math.floor((n * (k + 1)) / 3)));
    if (slope10 < 0.3) add("mid", "stakes", "Enjeux qui n'escaladent pas", "La tension ne monte pas entre le premier tournant et le climax.",
      `Moyenne par tiers du film : ${fmt(third(0))} → ${fmt(third(1))} → ${fmt(third(2))} ; pente de ${fmt(slope10)} point(s) par tranche de 10 % du récit (un récit qui s'intensifie dépasse en général +0,5).`,
      "Faites payer un prix croissant au protagoniste : chaque obstacle doit coûter plus cher que le précédent.");
    else if (slope10 >= 0.8) strengths.push(`Les enjeux montent crescendo : +${fmt(slope10)} point(s) de tension par tranche de 10 % du film.`);
  }
  let linkRate = 1;
  if (n >= 6) {
    let linked = 0;
    for (let i = 1; i < n; i++) { const a = scenes[i - 1], b = scenes[i]; if ([...a.chars.keys()].some(c => b.chars.has(c)) || [...a.props].some(p => b.props.has(p))) linked++; }
    linkRate = linked / (n - 1);
    if (linkRate < 0.5) add("mid", "linkage", "Scènes juxtaposées", "Les scènes s'enchaînent peu entre elles.",
      `Seules ${linked} paires de scènes consécutives sur ${n - 1} partagent un personnage ou un objet : le récit avance par « et ensuite » plutôt que par « par conséquent / mais alors ».`,
      "Faites de chaque scène la conséquence de la précédente : une décision, une erreur ou une découverte qui déclenche la suite.");
  }

  /* ── principes de dramaturgie (cours de scénario, modèle actantiel, paradigme de Field) ── */
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const antag = findAntagonist(B, infos, prot);
  if (antag && n >= 9) {
    const ids = new Set(B.characters.find(c => c.name === antag).scenes);
    for (let k = 0; k < 3; k++) {
      const a = Math.floor((n * k) / 3), b = Math.floor((n * (k + 1)) / 3);
      const range = scenes.slice(a, b).map(s => s.id);
      if (range.length && !range.some(id => ids.has(id)))
        add("mid", "opponent", `${antag} disparaît du récit`, `L'opposant n'apparaît dans aucune scène du ${["premier", "deuxième", "dernier"][k]} tiers (scènes ${list(range)}).`,
          `L'antagonisme entre le sujet et l'opposant doit durer tout au long du récit : sans lui, la tension retombe. ${antag} apparaît dans ${ids.size} scène(s) sur ${n}.`,
          "Faites sentir l'opposant (menace, conséquence de ses actes, regard d'un autre personnage) même quand il est absent à l'écran.", range, startOf(range));
    }
  }
  const LUCK = /par hasard|par chance|heureusement|miraculeusement|coïncidence|comme par miracle|à point nommé|par un heureux hasard|juste à temps/i;
  const lucky = [];
  scenes.forEach(s => s.lines.forEach(l => { if ((l.type === "action" || l.type === "dialogue") && LUCK.test(l.text)) lucky.push({ i: l.i, id: s.id }); }));
  if (lucky.length) {
    const late = lucky.filter(x => (x.id - 1) / Math.max(1, n - 1) > 0.75);
    add(late.length ? "mid" : "low", "luck", late.length ? "Hasard dans le dénouement" : "Recours au hasard", `${lucky.length} formule(s) de hasard ou de chance (« par hasard », « heureusement »…).`,
      late.length ? `${late.length} figurent dans le dernier quart : un dénouement doit découler logiquement de ce qui précède, pas d'une coïncidence (deus ex machina).` : "Un événement dû au hasard affaiblit la nécessité du récit : chaque fait doit avoir une cause.",
      "Préparez l'événement par une cause antérieure (préparation) ou faites-le résulter d'un choix du héros.", [...new Set(lucky.map(x => x.id))], lucky.map(x => x.i));
  }
  if (n >= 6 && vals[0] < Math.min(med, 3.5) && !infos[0].factors.some(f => f.key === "conflict"))
    add("low", "hook", "Ouverture peu accrocheuse", "La première scène ne crée pas de tension.",
      `Tension de ${fmt(vals[0])}/10 pour une médiane de ${fmt(med)} et aucun marqueur de conflit : le point d'attaque doit « accrocher » le spectateur dès le début.`,
      "Commencez plus tard, en pleine action, et distillez l'exposition en mouvement plutôt qu'en explications.", [1], [scenes[0].start]);
  if (prot && n >= 6) {
    const re = new RegExp(`(?<![\\p{L}])${esc(prot.name)}(?![\\p{L}])`, "giu");
    let c = 0;
    scenes.slice(0, Math.max(1, Math.ceil(n * 0.15))).forEach(s => s.lines.forEach(l => { if (l.type === "action" || l.type === "dialogue") c += (l.text.match(re) || []).length; }));
    if (c < 3) add("low", "name", "Nom du protagoniste peu répété au début", `${prot.name} n'est cité que ${c} fois dans les premières scènes.`,
      "Pour qu'un public retienne une information, elle doit être répétée plusieurs fois, sous des formes variées ; le nom des personnages principaux se prononce souvent dès l'ouverture.",
      "Faites prononcer le nom par d'autres personnages et placez-le dans l'action des premières scènes.", [1], [scenes[0].start]);
    const dialShare = scenes.reduce((a, s) => a + s.dialogueWords, 0) / Math.max(1, scenes.reduce((a, s) => a + s.dialogueWords + s.actionWords, 0));
    const early = scenes.slice(0, Math.ceil(n * 0.4));
    if (dialShare > 0.25 && !early.some(s => s.lines.some(l => l.type === "dialogue" && l.who === prot.name && WANT_RE.test(l.text))))
      add("low", "goal", "But du protagoniste non formulé", `${prot.name} n'exprime aucun désir ni projet dans les 40 % premiers du récit.`,
        "Le but principal doit être posé aussitôt que possible pour créer l'anticipation (même s'il peut passer par l'image dans un film peu dialogué).", "Faites formuler (ou montrer) ce que le héros veut, et ce qu'il risque de perdre.");
  }
  const nightOf = s => (/NUIT|SOIR/.test(s.time) ? 1 : /JOUR|MATIN|AUBE|APR[ÈE]S-MIDI/.test(s.time) ? 0 : null);
  { let best = [0, 0], start = 0;
    for (let i = 1; i <= n; i++) { if (i === n || nightOf(scenes[i]) !== nightOf(scenes[start]) || nightOf(scenes[i]) === null) { if (nightOf(scenes[start]) !== null && i - start > best[1] - best[0]) best = [start, i]; start = i; } }
    if (n >= 8 && best[1] - best[0] >= 6) { const ids = scenes.slice(best[0], best[1]).map(s => s.id);
      add("low", "daynight", "Peu d'alternance jour / nuit", `${ids.length} scènes d'affilée de ${nightOf(scenes[best[0]]) ? "nuit" : "jour"} (scènes ${list(ids)}).`,
        "L'alternance des jours et des nuits donne un rythme naturel au récit et fait glisser le temps plus vite.", "Insérez une scène de contraste (autre moment de la journée) pour faire respirer la séquence.", ids, startOf(ids)); } }
  if (n >= 8) {
    const ts = Math.floor(n * 0.65), tv = vals.slice(ts), ci = ts + tv.indexOf(Math.max(...tv));
    const after = (rt.total - (rt.start[ci] + rt.dur[ci])) / (rt.total || 1);
    if (after > 0.15) add("low", "long-end", "Dénouement trop long", `Après le climax (scène ${ci + 1}), il reste ${Math.round(after * 100)} % du film.`,
      `Le dénouement classique est bref : ici ${fmtDur(after * rt.total)} s'écoulent après le moment le plus intense du dernier tiers.`, "Resserrez la résolution : une ou deux scènes suffisent généralement.", [ci + 1], [scenes[ci].start]);
  }
  const pv1 = beats.find(b => b.name === "Premier tournant"), pv2 = beats.find(b => b.name.startsWith("Crise"));
  [[pv1, 0.15, 0.35, "Acte I", "premier tournant"], [pv2, 0.65, 0.85, "Acte III", "crise"]].forEach(([b, lo, hi, act, nm]) => {
    if (!b?.found || !rt.total) return;
    const p = b.minute / rt.total;
    if (p < lo || p > hi) add("mid", "act-length", `${act} ${(act === "Acte I") === (p < lo) ? "très court" : "très long"}`, `Le ${nm} tombe à ${Math.round(p * 100)} % du film (scène ${b.scene}).`,
      `Le paradigme classique répartit le film en quart / moitié / quart : le ${nm} se situe normalement autour de ${act === "Acte I" ? 25 : 75} %. Ici : ${Math.round(p * 100)} % (≈ ${fmtDur(b.minute)}).`,
      "Déplacez le tournant ou rééquilibrez la durée des actes pour retrouver une progression plus classique (sauf choix de forme assumé).", [b.scene], [scenes[b.scene - 1].start]);
  });
  scenes.forEach((s, i) => {
    const mv = infos[i].factors.find(f => f.key === "move");
    const long = s.lines.filter(l => l.type === "dialogue" && words(l.text) > 14);
    if (mv && mv.points >= 3 && long.length) add("low", "chase", "Poursuite bavarde", `La scène ${s.id} mêle action intense et répliques longues.`,
      `${mv.detail} mais ${long.length} réplique(s) de plus de 14 mots : le dialogue ralentit l'action, les répliques doivent être brèves et laconiques dans une poursuite.`, "Réduisez chaque réplique à quelques mots et laissez l'action porter l'information.", [s.id], long.map(l => l.i));
  });

  /* rythme global */
  if (n >= 8 && sd < 1.2) add("mid", "flat", "Rythme monotone", "La courbe de tension est presque plate.", `Écart-type de ${fmt(sd)} (< 1,2) : toutes les scènes ont une intensité voisine, sans respiration ni montée.`, "Alternez scènes de pression et scènes de calme ; creusez un contraste avant le climax.");
  else if (n >= 5 && sd > 2) strengths.push(`Bonne alternance de tension (écart-type ${fmt(sd)}) : montées et respirations bien contrastées.`);

  const order = { high: 0, mid: 1, low: 2 };
  flaws.sort((a, b) => order[a.severity] - order[b.severity]);
  flaws.forEach((f, i) => { f.id = i; });

  /* marqueurs par ligne (éditeur) */
  const flags = {};
  flaws.forEach(f => { const at = f.lines.length ? f.lines : f.scenes.slice(0, 8).map(id => scenes[id - 1]?.start).filter(x => x != null);
    at.forEach(i => (flags[i] = flags[i] || []).push(f)); });

  const dial = scenes.reduce((a, s) => a + s.dialogueWords, 0), act = scenes.reduce((a, s) => a + s.actionWords, 0);
  const extra = insights({ scenes, B, vals, infos, beats, flaws, rt, slope10, linkRate });
  return {
    strengths, flaws, flags, scenes: infos, beats, peaks, valleys, ...extra, trend, slope10, linkRate, median: med,
    curve: vals, climax: vals.length ? vals.indexOf(Math.max(...vals)) : -1,
    metrics: { scenes: n, pages: B.pages, minutes: B.minutes, characters: B.characters.length, locations: B.locations.length,
      dialoguePct: Math.round((dial / Math.max(1, dial + act)) * 100), protagonist: prot?.name },
  };
}
