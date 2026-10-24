# CinéDesk

Logiciel macOS tout-en-un pour réalisateurs et scénaristes (Tauri 2 + React + Tailwind), au style « pâte à modeler ».

## Fonctions
- **Importer un scénario** (bouton orange, ⌘O, ou glisser un fichier n'importe où dans la fenêtre) : PDF, Word (.docx), Final Draft (.fdx), Fountain, texte. CinéDesk reconnaît séquences, personnages, dialogues, parenthèses, transitions et actions, affiche un aperçu avec un indice de fiabilité, puis construit le séquencier (post-it) et prépare le storyboard.
- **Coller un scénario** dans l'éditeur : le texte est reclassé automatiquement (plus de bloc « empaqueté »).
- **Scénario** : éditeur à la norme (Courier 12 pt), Entrée / Tab / ⌘1–6, complétion des noms, numérotation des scènes.
- **Post-it** : mur par actes, filtres de couleur, liens « fusil de Tchekhov », synchronisation scénario ⇄ post-it.
- **Storyboard** · **Dépouillement** (personnages, décors, accessoires, plan de tournage, feuille de service PDF).
- **Bureau** : tableau libre de références. Glissez des images ou des liens, ou collez-les (⌘V) ; post-it, textes, étiquettes (Lumière, Décor, Costume…), redimensionnement, filtre. Les boutons Film Grab, Eye Candy, Pinterest, ShotDeck, The Script Lab et CNC ouvrent le site dans **votre navigateur** (avec vos bloqueurs de publicités).
- **Script Doctor** (interrupteur dans la barre du haut, 100 % local) :
  - courbe de tension **interactive** : survolez un point pour voir la scène, sa valeur, **pourquoi** (mots de conflit relevés, exclamations, échanges rapides, objet à enjeu…) et ce qui a changé par rapport à la scène précédente ;
  - structure du récit (incident déclencheur, points de bascule, climax) vérifiée avec justification ;
  - **failles localisées** : repère coloré dans la marge du scénario (survol = explication), liste détaillée avec « Pourquoi » chiffré, « Où » cliquable et solution **sur demande** ;
  - présence des personnages scène par scène ; IA locale optionnelle (voir `BUILD.md`).
- **Fichiers** : projets `.cinedesk`, sauvegarde automatique, annuler/rétablir, export PDF Hollywood / CNC, FDX, Fountain.

## Mettre à jour votre dépôt GitHub (si vous avez déjà la version précédente)
1. Décompressez la nouvelle archive.
2. Sur la page de votre dépôt : **Add file → Upload files**, glissez le **contenu** du dossier (avec `.github` si besoin) et validez par **Commit changes**. Les fichiers de même nom sont remplacés. L'ancien fichier `src/modules/Inspiration.jsx` peut rester, il n'est plus utilisé.
3. Onglet **Actions → Build macOS DMG → Run workflow**, puis téléchargez l'artefact **CineDesk-dmg**.
Le build dure 10 à 15 minutes. Si une étape échoue, copiez-moi les dernières lignes du message d'erreur.

## Construire en local
```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm install
npx tauri icon app-icon.png
npm test
npm run tauri dev
npm run tauri build -- --target universal-apple-darwin --bundles dmg
```

## Premier lancement (app non signée)
Clic droit sur CinéDesk → **Ouvrir**, ou : `xattr -dr com.apple.quarantine /Applications/CinéDesk.app`. Signature Apple : voir `BUILD.md`.

## Limites connues
- **PDF scannés (images)** : aucune reconnaissance de texte (pas d'OCR). L'application le signale ; exportez un PDF « texte » depuis votre logiciel d'écriture.
- **Mises en page atypiques** (noms centrés, deux colonnes, tableaux) : la reconnaissance retombe sur l'analyse du texte seul, moins fiable. Vérifiez l'aperçu avant d'importer ; un élément se corrige avec ⌘1–6.
- Le Script Doctor repose sur des heuristiques (lexique de conflit, répétitions, position des objets) : il guide la relecture, il ne juge pas la qualité littéraire. Les valeurs de tension sont **relatives au film** (échelle 0–10 entre sa scène la plus calme et la plus tendue).
- Le code a été testé par des tests automatiques (`npm test`) et un rendu de chaque écran, mais pas encore lancé dans une vraie fenêtre Tauri : l'aspect final et les interactions (glisser-déposer, ouverture de fichiers) sont à valider au premier lancement.
- Le double-clic sur un `.cinedesk` dans le Finder n'ouvre pas encore le projet : utilisez ⌘O ou glissez le fichier dans la fenêtre.
- Police : Courier New par défaut.

## Structure
`src/lib` moteurs (import, analyse, formats, PDF) · `src/modules` écrans · `src/hooks` historique et IA locale · `src-tauri` application native · `tests` tests automatiques.
