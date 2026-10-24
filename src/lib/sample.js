const h = text => ({ type: "heading", text });
const a = text => ({ type: "action", text });
const c = text => ({ type: "character", text });
const d = text => ({ type: "dialogue", text });
export const sampleScript = [
  h("INT. APPARTEMENT DE LÉA – NUIT"), a("Une LETTRE jaunie repose sur la table. Léa la déplie, les mains tremblantes."),
  c("LÉA"), d("Il savait. Depuis le début, il savait."),
  h("EXT. RUE – JOUR"), a("Léa marche vite. Marc l'attend devant sa VOITURE."),
  c("MARC"), d("Tu n'aurais pas dû venir."), c("LÉA"), d("Dis-moi la vérité. Maintenant !"),
  h("INT. BAR – NUIT"), a("Marc glisse un REVOLVER sous le comptoir. Personne ne le voit."),
  c("MARC"), d("Tu m'as trahi."), c("LÉA"), d("Non. Tu as menti, depuis le début."),
  h("EXT. PORT – NUIT"), a("Léa court entre les conteneurs. Des coups de feu éclatent."), c("LÉA"), d("Laissez-moi !"),
  h("INT. COMMISSARIAT – JOUR"), a("Léa est assise face à l'inspecteur Roux. Un dossier épais entre eux."),
  c("ROUX"), d("Nous allons reprendre depuis le début, calmement, sans rien omettre de ce que vous avez vu cette nuit-là."),
  c("LÉA"), d("Je vous ai déjà tout dit, depuis le début, calmement."),
  h("INT. VOITURE – JOUR"), a("Léa conduit. Silence."), c("LÉA"), d("Je ne sais plus qui croire."),
  h("EXT. FORÊT – JOUR"), a("Le REVOLVER est caché dans un tronc creux. Léa le saisit."), c("LÉA"), d("Non, non, non !"),
  h("INT. PHARE – NUIT"), a("Marc attend en haut des marches. Léa braque le REVOLVER sur lui."),
  c("MARC"), d("Tire. Tu n'en auras jamais le courage."), c("LÉA"), d("Si. Pour elle."),
];
