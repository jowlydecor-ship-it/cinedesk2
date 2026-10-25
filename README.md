# CinéDesk

Logiciel macOS tout-en-un pour réalisateurs et scénaristes (Tauri 2 + React + Tailwind), au style « pâte à modeler » : surfaces texturées, coutures, boutons de vêtements cousus, post-it en papier craft.

## Fonctions
- **Importer un scénario** (bouton orange, ⌘O, ou glisser un fichier dans la fenêtre) : PDF, Word, Final Draft, Fountain, texte. Reconnaissance des séquences, personnages, dialogues, parenthèses, transitions (COUPE SUR, FONDU, ENCHAÎNEMENT, INTERCUT…) et actions, avec aperçu et indice de fiabilité. Le séquencier et le storyboard se construisent seuls. Le texte collé dans l'éditeur est reclassé automatiquement.
- **Scénario · Post-it · Storyboard · Dépouillement** : voir plus bas. Les post-it peuvent être colorés d'après l'analyse (scènes fortes / respirations, présence du protagoniste) et affichent leur tension.
- **Bureau de références** : tableau libre avec **explorateur intégré** (Eye Candy, Film Grab ou toute adresse) lu en mode épuré : seules les images, GIF et vidéos de la page sont affichées, **sans publicité, sans bandeau de cookies, sans script du site**. Glissez une carte vers le bureau ou cliquez sur « + ». Les **vidéos et GIF se lisent dans le logiciel** (vidéos jusqu'à 12 Mo sauvegardées dans le projet, au-delà lues en ligne). Glissez aussi des fichiers depuis le Finder ou collez avec ⌘V. Post-it, textes, étiquettes (Lumière, Décor…), filtre.
- **Script Doctor** (interrupteur du haut, 100 % local) :
  - courbe de tension **interactive** avec justification de chaque valeur, tendance des enjeux, repères de structure, minutes ;
  - **durée estimée** du film (règle de la page + débit des mots), durée de chaque scène, actes mesurés au temps ;
  - dialogue / action par scène, **apparition cumulée des personnages**, répliques, mots et part du dialogue par personnage ;
  - **failles localisées** (repères dans la marge du scénario) avec « Pourquoi » chiffré : ventre mou, enjeux qui n'escaladent pas, scènes juxtaposées, fusils de Tchekhov, opposant qui disparaît, hasard dans le dénouement, ouverture peu accrocheuse, longueur des actes, dénouement trop long, poursuite bavarde, jour/nuit, dialogues (tirades, exposition, « sur le nez »)… ;
  - **les 4 critères** (rythme, enjeux, arc, information) ;
  - **grille d'analyse pré-remplie** : structure narrative, personnages, parcours, préparations-paiements, suspense, spécificités ; **modèle actantiel** ; propositions dramatique et thématique ; **trame en 22 étapes**. Chaque ligne a une colonne de notes sauvegardée avec le projet ;
  - IA locale optionnelle (voir `BUILD.md`).
- **Fichiers** : projets `.cinedesk`, sauvegarde automatique, annuler/rétablir, export PDF Hollywood / CNC, FDX, Fountain, **séquencier texte** (une phrase par scène).

## Sources d'inspiration de l'analyse
Principes de dramaturgie, formulés avec nos propres mots (aucun texte d'ouvrage n'est reproduit) : paradigme en 3 actes (Syd Field), grille d'analyse d'un scénario de fiction d'Anna Marmiesse (Lycéens et apprentis au cinéma / Les 2 Scènes), modèle actantiel de Greimas et propositions dramatique / thématique (cours de scénario), trame en 22 étapes de John Truby.

## Mettre à jour votre dépôt GitHub
1. Décompressez la nouvelle archive.
2. Sur la page du dépôt : **Add file → Upload files**, glissez le **contenu** du dossier (pas le dossier lui-même), puis **Commit changes**. Les fichiers de même nom sont remplacés ; les anciens fichiers inutilisés (`Inspiration.jsx`) peuvent rester.
3. Le build démarre tout seul (onglet **Actions**) ou via **Run workflow**. Téléchargez l'artefact **CineDesk-dmg** (10 à 20 minutes ; plus long la première fois, deux nouveaux modules natifs sont compilés).
Si une étape échoue, copiez-moi les dernières lignes du message d'erreur.

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
- **Explorateur de références** : il lit les pages et en extrait les médias ; ce n'est pas un navigateur complet. Je n'ai **pas pu le tester sur les vrais sites** (pas d'accès réseau ici) : il est validé sur des pages d'essai piégées de publicités. Si Eye Candy ou Film Grab changent leur structure ou chargent leurs images par JavaScript, certaines cartes peuvent manquer ; dans ce cas, « Ouvrir dans le navigateur » reste disponible. Pinterest, Instagram et ShotDeck exigent une connexion et ne peuvent pas être lus : copiez-y une image (clic droit) puis ⌘V dans le bureau. Les autorisations réseau de l'app (`src-tauri/capabilities/default.json`) peuvent demander un ajustement au premier essai.
- **PDF scannés** (images) : pas d'OCR. **Mises en page atypiques** (noms centrés, deux colonnes) : reconnaissance moins fiable, vérifiez l'aperçu avant d'importer.
- **Script Doctor** : règles et statistiques, pas une lecture « littéraire ». Les valeurs de tension sont relatives au film (0 à 10 entre sa scène la plus calme et la plus tendue). L'arc du personnage et le sens profond ne sont qu'esquissés (indice de prise de conscience) : grille à compléter ou IA locale. Durée estimée à ±15 %.
- **Style visuel** : validé sur une maquette des mêmes classes CSS ; l'aspect exact dans l'application compilée reste à constater au premier lancement (la police « Marker Felt » des post-it est celle de macOS).
- Le double-clic sur un `.cinedesk` dans le Finder n'ouvre pas encore le projet : ⌘O ou glisser-déposer.

## Structure
`src/lib` moteurs (import, analyse, lecteur, formats, PDF) · `src/modules` écrans · `src/hooks` historique et IA locale · `src-tauri` application native · `tests` tests automatiques.
