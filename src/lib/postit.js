/* Couleurs des post-it : celles d'un vrai bloc de post-it (jaune, rouge-orangé, bleu ciel, rose, bleu, vert). */
export const COLORS = { A: "#FDD75F", B: "#FF6A3D", C: "#9ADFEB", D: "#F2C8C5", E: "#6B9FC3", F: "#9DCB5E" };
export const COLOR_LABEL = { A: "Intrigue A", B: "Sous-intrigue", C: "Personnage", D: "Émotion", E: "Lieu", F: "Rythme" };
export const COLOR_LIST = Object.values(COLORS);
/* coin corné stable selon l'identifiant : aucun, bas-droite ou bas-gauche */
export const curlOf = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return ["", "postit-br", "", "postit-bl"][Math.abs(h) % 4]; };
