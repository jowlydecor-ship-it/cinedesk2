/* Indicateurs complémentaires du Script Doctor : durée, actes, personnages, grille d'analyse, critères.
   La grille reprend la structure de la « Grille d'analyse d'un scénario de fiction » d'Anna Marmiesse
   (Lycéens et apprentis au cinéma, Bourgogne-Franche-Comté / Les 2 Scènes), pré-remplie automatiquement. */
import { eighths } from "./screenplay.js";

export const fmtDur = m => (m < 1 ? `${Math.round(m * 60)} s` : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}`);
const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const ACT_NAMES = ["Acte I", "Acte II-A", "Acte II-B", "Acte III"];
export const WANT_RE = /\bje (veux|dois|vais|cherche|voudrais)\b|il faut que je|je ne (peux|veux) pas/i;
export const REVEAL_RE = /je (comprends|ai compris|sais maintenant|vois maintenant|me rends compte|réalise)|enfin|tout ce temps|c['’]était (moi|toi|lui|elle)|j['’]aurais dû|plus jamais/i;

/* Antagoniste probable : le personnage qui partage le plus de scènes conflictuelles avec le protagoniste. */
export function findAntagonist(B, infos, prot = B.characters[0]) {
  if (!prot) return null;
  const protIds = new Set(prot.scenes);
  let antag = null, best = 0;
  B.characters.forEach(c => {
    if (c.name === prot.name) return;
    const shared = c.scenes.filter(id => protIds.has(id));
    if (shared.length < 2) return;
    const score = shared.length + shared.reduce((a, id) => a + (infos[id - 1].factors.find(x => x.key === "conflict")?.points || 0) + (infos[id - 1].factors.find(x => x.key === "duel")?.points || 0), 0);
    if (score > best) { best = score; antag = c.name; }
  });
  return antag;
}

/* Durée estimée : moyenne entre la règle « 1 page ≈ 1 minute » et le débit des mots (dialogue 150 mots/min, action plus lente). */
export function runtimeOf(scenes) {
  const sec = scenes.map(s => Math.max(6, s.dialogueWords / 2.5 + s.actionWords / 3.2 + 4));
  const wordMin = sec.reduce((a, b) => a + b, 0) / 60;
  const pageMin = scenes.reduce((a, s) => a + s.eighths, 0) / 8;
  const total = scenes.length ? (wordMin + pageMin) / 2 : 0;
  const k = wordMin ? total / wordMin : 1;
  const dur = sec.map(x => (x / 60) * k);
  let t = 0;
  const start = dur.map(d => { const s = t; t += d; return s; });
  return { total, wordMin, pageMin, low: Math.min(wordMin, pageMin) * 0.92, high: Math.max(wordMin, pageMin) * 1.08, dur, start };
}

export function insights({ scenes, B, vals, infos, beats, flaws, rt, slope10, linkRate }) {
  const n = scenes.length;
  const total = rt.total || 1;
  const at = i => `scène ${i + 1} (${scenes[i].heading.toLowerCase()}, ≈ ${fmtDur(rt.start[i])})`;
  const actOf = i => Math.min(3, Math.floor(((rt.start[i] + rt.dur[i] / 2) / total) * 4));

  /* actes mesurés au temps */
  const acts = ACT_NAMES.map((name, a) => {
    const idx = scenes.map((_, i) => i).filter(i => actOf(i) === a);
    return { name, from: idx[0] != null ? idx[0] + 1 : null, to: idx.at(-1) != null ? idx.at(-1) + 1 : null, scenes: idx.length, minutes: idx.reduce((s, i) => s + rt.dur[i], 0) };
  });

  /* personnages : présence, répliques, mots, part du dialogue */
  const totalWords = B.characters.reduce((a, c) => a + c.words, 0) || 1;
  const characters = B.characters.slice(0, 10).map(c => {
    const cells = scenes.map(s => s.chars.get(c.name)?.words || 0);                 // mots de dialogue
    const acts = scenes.map(s => s.chars.get(c.name)?.actions || 0);                // mentions dans l'action
    const pres = scenes.map(s => (s.chars.has(c.name) ? 1 : 0));                    // présence (dialogue OU action)
    let run = 0;
    return { name: c.name, scenes: c.scenes.length, lines: c.lines, words: c.words, total: c.words, share: Math.round((c.words / totalWords) * 100),
      first: c.scenes[0], last: c.scenes.at(-1), actions: c.actions, cells, acts, pres, cum: cells.map(w => (run += w)) };
  });

  /* traits du récit (cf. « Spécificités du récit » de la grille) */
  const dialogueShare = scenes.reduce((a, s) => a + s.dialogueWords, 0) / Math.max(1, scenes.reduce((a, s) => a + s.dialogueWords + s.actionWords, 0));
  const vo = scenes.reduce((a, s) => a + s.lines.filter(l => l.type === "character" && /\((?:V\.?\s?O\.?|O\.?\s?S\.?|OFF|voix off)\)/i.test(l.text)).length, 0);
  const flash = scenes.filter(s => /FLASH[- ]?BACK|SOUVENIR|RETOUR EN ARRI[ÈE]RE|AUTREFOIS|PLUS TÔT/i.test(s.heading + " " + s.time)).length;
  const places = new Set(scenes.map(s => s.location)).size;
  const traits = [
    dialogueShare < 0.25 ? `Scénario très peu dialogué (${Math.round(dialogueShare * 100)} % de dialogue) : l'essentiel passe par l'image et l'action.`
      : dialogueShare > 0.6 ? `Scénario très dialogué (${Math.round(dialogueShare * 100)} % de dialogue).` : `Équilibre dialogue / action (${Math.round(dialogueShare * 100)} % de dialogue).`,
    vo ? `Voix off ou hors-champ : ${vo} prise(s) de parole.` : "",
    flash ? `${flash} séquence(s) en flash-back ou retour dans le passé.` : "",
    B.characters.length > 10 ? `Récit choral : ${B.characters.length} personnages parlants.` : "",
    n >= 4 && places / n < 0.5 ? `Forte unité de lieu : ${places} décor(s) pour ${n} scènes.` : n >= 4 && places / n > 0.9 ? `Récit itinérant : presque chaque scène change de décor (${places} décors).` : "",
  ].filter(Boolean);

  /* grille d'analyse pré-remplie */
  const prot = B.characters[0];
  const protIds = new Set(prot?.scenes || []);
  const antag = findAntagonist(B, infos, prot);
  const wants = scenes.slice(0, Math.max(1, Math.ceil(n * 0.4))).flatMap(s => s.lines.filter(l => l.type === "dialogue" && l.who === prot?.name && WANT_RE.test(l.text))).slice(0, 2).map(l => `« ${l.text.slice(0, 90)}${l.text.length > 90 ? "…" : ""} »`);
  const late = scenes.slice(Math.floor(n * 0.7));
  const revL = late.flatMap(s => s.lines.filter(l => l.type === "dialogue" && l.who === prot?.name && REVEAL_RE.test(l.text)).map(l => ({ id: s.id, text: l.text, i: l.i })))[0] || null;
  const bt = name => beats.find(b => b.name.startsWith(name));
  const incW = infos.map((x, i) => i).filter(i => n >= 4 && i > 0 && i / (n - 1) >= 0.06 && i / (n - 1) <= 0.2);
  const inc = incW.sort((a, b) => (vals[b] - vals[b - 1]) - (vals[a] - vals[a - 1]))[0] ?? Math.min(1, n - 1);
  const mid = bt("Point médian")?.scene - 1;
  const climaxIdx = Math.max(Math.floor(n * 0.65), 0) + vals.slice(Math.floor(n * 0.65)).indexOf(Math.max(...vals.slice(Math.floor(n * 0.65))));
  const planted = B.props.filter(p => p.scenes.length >= 2).slice(0, 5).map(p => `« ${p.name} » : scène ${p.scenes[0]} → reprise scène${p.scenes.length > 2 ? "s" : ""} ${p.scenes.slice(1).join(", ")}`);
  const orphan = flaws.filter(f => f.kind === "chekhov").map(f => f.title);
  const peaks = infos.filter(x => x.role === "pic").slice(0, 4).map(x => `scène ${x.id} (${f1(x.value)}/10)`);
  const grid = [
    ["STRUCTURE NARRATIVE", "exposition", "Exposition", n ? `Ouverture : ${at(0)}. ${scenes[0].firstAction ? scenes[0].firstAction.slice(0, 140) : ""}` : ""],
    ["STRUCTURE NARRATIVE", "incident", "Élément déclencheur", n >= 2 ? `Probablement ${at(inc)} : première vraie montée de tension (${f1(vals[inc])}/10).` : ""],
    ["STRUCTURE NARRATIVE", "bascule", "Bascule vers l'acte 2", bt("Premier tournant") ? `${bt("Premier tournant").found ? "Repéré" : "Non repéré"} autour de ${bt("Premier tournant").at} % : ${at(bt("Premier tournant").scene - 1)}.` : ""],
    ["STRUCTURE NARRATIVE", "peripeties", "Péripéties principales", peaks.length ? `Pics de tension : ${peaks.join(" ; ")}.` : "Aucun pic net détecté."],
    ["STRUCTURE NARRATIVE", "midpoint", "Midpoint (point médian)", mid >= 0 ? `Autour de 50 % : ${at(mid)}, tension ${f1(vals[mid])}/10.` : ""],
    ["STRUCTURE NARRATIVE", "climax", "Climax (bascule vers l'acte 3)", n ? `Moment le plus intense du dernier tiers : ${at(climaxIdx)}, ${f1(vals[climaxIdx])}/10.` : ""],
    ["STRUCTURE NARRATIVE", "denouement", "Dénouement / résolution", n ? `Fermeture : ${at(n - 1)}. ${scenes[n - 1].firstAction ? scenes[n - 1].firstAction.slice(0, 140) : ""}` : ""],
    ["PERSONNAGES", "protagoniste", "Protagoniste(s)", prot ? `${prot.name} (${prot.scenes.length}/${n} scènes, ${prot.words} mots).` : ""],
    ["PERSONNAGES", "antagoniste", "Antagoniste(s)", antag ? `${antag} (probable : partage le plus de scènes conflictuelles avec ${prot.name}).` : "Non déterminé automatiquement."],
    ["PERSONNAGES", "secondaires", "Personnages secondaires", B.characters.slice(antag ? 1 : 1).filter(c => c.name !== antag).slice(0, 6).map(c => c.name).join(", ")],
    ["PARCOURS DU PERSONNAGE PRINCIPAL", "objectif", "Objectif du ou de la protagoniste", wants.length ? `Indices dans ses répliques : ${wants.join(" ; ")}` : "À renseigner : le moteur ne peut pas l'inférer sans indice explicite."],
    ["PARCOURS DU PERSONNAGE PRINCIPAL", "obstInt", "Obstacles internes", "À renseigner (peur, croyance limitante, défaut…)."],
    ["PARCOURS DU PERSONNAGE PRINCIPAL", "obstExt", "Obstacles externes", antag ? `Antagoniste probable : ${antag}.` : "À renseigner."],
    ["PARCOURS DU PERSONNAGE PRINCIPAL", "changement", "Changement / évolution", "À évaluer : le personnage passe-t-il d'une croyance limitante à une vérité ? (analyse IA locale ou saisie manuelle)."],
    ["PRÉPARATIONS – PAIEMENTS", "preparations", "Éléments introduits tôt puis réutilisés", planted.length || orphan.length ? [planted.join(" · "), orphan.length ? `Sans suite : ${orphan.join(", ")}.` : ""].filter(Boolean).join(" ") : "Aucun objet important repéré."],
    ["SUSPENSE", "suspense", "Situations de suspense", peaks.length ? `Scènes les plus tendues : ${peaks.join(" ; ")}.` : "Peu de suspense mesuré."],
    ["SPÉCIFICITÉS DU RÉCIT", "specificites", "Spécificités", traits.join(" ")],
    ...extraGrid(),
  ].map(([group, key, label, auto]) => ({ group, key, label, auto }));

  function extraGrid() {
    const man = "À renseigner.";
    const adj = (() => { let b = null, bs = 0; B.characters.forEach(c => { if (c.name === prot?.name || c.name === antag) return; const sh = c.scenes.filter(id => protIds.has(id)).length; if (sh > bs) { bs = sh; b = c.name; } }); return b; })();
    const near = f => { const i = Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))); return at(i); };
    const tw = (a, b) => { let bi = -1, bv = -99; for (let i = Math.max(1, Math.floor(n * a)); i < Math.min(n, Math.ceil(n * b)); i++) if (vals[i] - vals[i - 1] > bv) { bv = vals[i] - vals[i - 1]; bi = i; } return bi; };
    const crise = bt("Crise"), clim = bt("Climax"), p1 = bt("Premier tournant");
    const G1 = "MODÈLE ACTANTIEL (Greimas)", G2 = "PROPOSITIONS (dramatique, thématique, caractérielle)", G3 = "TRAME EN 22 ÉTAPES (d'après la méthode de John Truby)";
    return [
      [G1, "act_sujet", "Sujet (celui qui désire)", prot ? `${prot.name}.` : man],
      [G1, "act_objet", "Objet (ce qui est désiré)", wants.length ? `Indices : ${wants.join(" ; ")}` : man],
      [G1, "act_opposant", "Opposant", antag ? `${antag} (probable).` : man],
      [G1, "act_adjuvant", "Adjuvant (aide le sujet)", adj ? `${adj} (le plus présent avec ${prot?.name} hors opposant).` : man],
      [G1, "act_destinateur", "Destinateur (porte les valeurs, confie la mission)", man],
      [G1, "act_destinataire", "Destinataire (bénéficiaire du résultat)", man],
      [G2, "prop_dram", "Proposition dramatique principale", "À formuler en une phrase : personnage + conflit + issue (ex. « En poursuivant un but vénal, on découvre que l'amour vaut plus que l'argent »)."],
      [G2, "prop_them", "Proposition thématique principale", "À formuler : le sens profond derrière l'action (le POURQUOI). Que montre-t-on concrètement à l'image ?"],
      [G2, "prop_car", "Proposition caractérielle du héros", "À formuler : une maxime simple qui résume le personnage."],
      [G3, "t1", "1 · Besoin, désir et auto-révélation finale", man],
      [G3, "t2", "2 · Fantôme et monde du récit", `Décors principaux : ${B.locations.slice(0, 3).map(l => l.name.toLowerCase()).join(", ") || "—"}.`],
      [G3, "t3", "3 · Faiblesse et besoin", man],
      [G3, "t4", "4 · Événement déclencheur", n >= 2 ? `Probablement ${at(inc)}.` : man],
      [G3, "t5", "5 · Désir", wants.length ? wants.join(" ; ") : man],
      [G3, "t6", "6 · Allié(s)", adj ? `${adj} (probable).` : man],
      [G3, "t7", "7 · Opposant et/ou mystère", antag ? `${antag} (probable).` : man],
      [G3, "t8", "8 · Faux allié-opposant", man],
      [G3, "t9", "9 · Première révélation et décision (désir modifié)", p1 ? `Autour de ${p1.at} % : ${at(p1.scene - 1)}.` : man],
      [G3, "t10", "10 · Plan du héros", man],
      [G3, "t11", "11 · Plan de l'opposant et contre-attaque principale", n >= 6 && tw(0.5, 0.7) > 0 ? `Plus forte montée entre 50 et 70 % : ${at(tw(0.5, 0.7))}.` : man],
      [G3, "t12", "12 · Poussée (drive)", man],
      [G3, "t13", "13 · Attaque de l'allié", man],
      [G3, "t14", "14 · Défaite apparente", crise ? `${crise.found ? "Repérée" : "Non repérée"} autour de ${crise.at} % : ${at(crise.scene - 1)}.` : man],
      [G3, "t15", "15 · Deuxième révélation et décision (poussée obsessionnelle)", man],
      [G3, "t16", "16 · Révélation faite au public", man],
      [G3, "t17", "17 · Troisième révélation et décision", n >= 6 ? `Autour de 80 % : ${near(0.8)}.` : man],
      [G3, "t18", "18 · Porte, épreuves, visite de la mort", n >= 6 ? `Autour de 85 % : ${near(0.85)}.` : man],
      [G3, "t19", "19 · Bataille", clim ? `Climax : ${at(clim.scene - 1)}, ${f1(clim.value)}/10.` : man],
      [G3, "t20", "20 · Auto-révélation", revL ? `Indice : scène ${revL.id} (« ${revL.text.slice(0, 70)}${revL.text.length > 70 ? "…" : ""} »).` : "Non détectée automatiquement (peut passer par l'image)."],
      [G3, "t21", "21 · Décision morale", man],
      [G3, "t22", "22 · Nouvel équilibre", n ? `Dernière scène : ${at(n - 1)}.` : man],
    ];
  }

  /* les 4 critères du diagnostic (rythme, enjeux, arc, information) */
  const count = k => flaws.filter(f => k.includes(f.kind)).length;
  const criteria = [
    { key: "rythme", label: "Rythme", status: count(["slump", "flat", "long", "talky", "linkage"]) ? "warn" : "ok",
      detail: count(["slump", "flat", "long", "talky", "linkage"]) ? `${count(["slump", "flat", "long", "talky", "linkage"])} alerte(s) : ventre mou, scène étirée ou enchaînements faibles.` : `Pas de ventre mou détecté ; ${Math.round(linkRate * 100)} % des scènes consécutives sont reliées par un personnage ou un objet.` },
    { key: "enjeux", label: "Enjeux", status: n < 8 ? "manual" : slope10 >= 0.3 ? "ok" : "warn",
      detail: n < 8 ? "Trop peu de scènes pour mesurer l'escalade." : `Pente de ${f1(slope10)} point(s) par tranche de 10 % du film ${slope10 >= 0.3 ? "(les enjeux montent)" : "(la tension n'escalade pas)"}.` },
    { key: "arc", label: "Arc de personnage", status: revL ? "ok" : "manual",
      detail: revL ? `Indice d'une prise de conscience en scène ${revL.id} : « ${revL.text.slice(0, 80)}${revL.text.length > 80 ? "…" : ""} ». À confirmer à la lecture (le changement peut aussi passer par l'image).` : "Aucune prise de conscience explicite détectée (elle peut passer par l'image). Renseignez la grille ou lancez l'analyse IA locale." },
    { key: "information", label: "Information (préparations-paiements)", status: count(["chekhov"]) ? "warn" : "ok",
      detail: count(["chekhov"]) ? `${count(["chekhov"])} objet(s) sans payoff clair ou introduits tard.` : "Les objets importants sont plantés puis exploités." },
  ];
  return { runtime: rt, acts, characters, grid, traits, criteria, revelation: revL };
}
