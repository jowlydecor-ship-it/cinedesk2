/* Client IA locale – compatible API OpenAI : Ollama (:11434) ou llama-server (llama.cpp) embarqué en sidecar */
export const DEFAULT_BASE = "http://127.0.0.1:11434/v1";

export async function localModels(base = DEFAULT_BASE) {
  const r = await fetch(`${base}/models`);
  if (!r.ok) throw new Error("Serveur local indisponible");
  return (await r.json()).data.map(m => m.id);
}

export async function* streamChat({ base = DEFAULT_BASE, model, messages, signal }) {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4 }),
  });
  if (!r.ok || !r.body) throw new Error(`Erreur IA locale (${r.status})`);
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n"); buf = parts.pop();
    for (const p of parts) {
      const s = p.replace(/^data:\s*/, "").trim();
      if (!s || s === "[DONE]") continue;
      try { const d = JSON.parse(s).choices?.[0]?.delta?.content; if (d) yield d; } catch { /* ligne partielle */ }
    }
  }
}

export const SYSTEM = `Tu es un script doctor professionnel (structure, rythme, arcs, dialogues). Tu réponds en français, de façon précise et bienveillante.
Références de structure (paradigme en 3 actes) : Acte I (0–25 %) : statu quo, incident incitateur vers 10–12 %, premier tournant vers 25 % (décision irrévocable). Acte II (25–75 %) : montée des obstacles, point médian à 50 % (retournement majeur), crise « tout est perdu » vers 75 %. Acte III (75–100 %) : second tournant (révélation), climax, résolution.
Audit selon 4 critères : (1) Rythme : ventre mou, enchaînement par cause à effet (« par conséquent / mais alors ») plutôt que par addition (« et puis »). (2) Enjeux : ce que le protagoniste a à perdre (internes, relationnels, externes) et si les enjeux montent crescendo. (3) Arc : le protagoniste passe-t-il d'une croyance limitante à une vérité ? (4) Information : préparations/paiements (fusils de Tchekhov), pas de deus ex machina.
Tu t'appuies sur le dossier d'analyse fourni (chiffres calculés localement) et tu ne les contredis pas.
Tu ne réécris jamais le scénario de l'auteur : tu diagnostiques et, seulement si on te le demande, tu proposes des pistes.`;

export function dossier(scenes, report) {
  const m = report.metrics;
  const head = `Scénario : ${m.scenes} scènes, ~${m.pages} pages, ${m.characters} personnages, ${m.locations} décors, dialogue ${m.dialoguePct} %. Protagoniste probable : ${m.protagonist || "?"}.`;
  const sc = scenes.slice(0, 80).map((s, i) =>
    `${s.id}. ${s.heading} | ${[...s.chars.keys()].join(", ") || "-"} | tension ${report.curve[i]} | ${s.firstAction.slice(0, 120)}`).join("\n");
  const fl = report.flaws.map(f => `- [${f.severity}] ${f.title} : ${f.text} Pourquoi : ${f.why}`).join("\n") || "- aucune alerte automatique";
  return `${head}\n\nSCÈNES\n${sc}\n\nALERTES DU MOTEUR\n${fl}`;
}

export const deepMessages = (scenes, report) => [
  { role: "system", content: SYSTEM },
  { role: "user", content: `${dossier(scenes, report)}\n\nFais un diagnostic en 2 volets uniquement : 1) POINTS FORTS 2) FAILLES & INCOHÉRENCES (ventres mous, dialogues superflus, nœuds dramatiques manquants). Évalue explicitement les 4 critères (rythme, enjeux, arc de personnage, information) et indique à chaque fois la scène concernée. Complète aussi, en une phrase chacun : objectif du protagoniste, obstacles internes, obstacles externes, changement du personnage. Ne propose aucune solution.` },
];

export const fixMessages = (scenes, report, flaw) => [
  { role: "system", content: SYSTEM },
  { role: "user", content: `${dossier(scenes, report)}\n\nL'auteur demande explicitement des pistes pour ce problème : « ${flaw.title} – ${flaw.text} ». Propose 3 alternatives concrètes, courtes, sans réécrire de scène.` },
];
