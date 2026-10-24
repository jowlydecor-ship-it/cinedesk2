# CinéDesk – Build, signature et IA locale

> Le projet complet est fourni (voir `README.md`). Ce guide détaille la signature Apple et l'IA locale embarquée.

## Stack retenue : Tauri v2 + React + Vite + Tailwind
- App légère (~10 Mo contre ~100 Mo avec Electron), webview WebKit native (rendu très proche de macOS).
- Build universel Apple Silicon + Intel en une commande.
- Alternative : SwiftUI pur (plus natif, mais éditeur de texte riche et mur de post-it plus longs à développer).

## Arborescence
```
cinedesk/
├─ src/
│  ├─ App.jsx            # shell macOS + modules (fourni)
│  ├─ main.jsx           # point d'entrée React
│  ├─ index.css          # directives Tailwind
│  ├─ modules/           # à extraire : script/, wall/, board/, doctor/
│  └─ lib/               # export PDF, dépouillement, client IA
├─ src-tauri/
│  ├─ src/main.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ package.json
└─ vite.config.js
```

## 1. Prérequis (macOS)
Installer ensuite les dépendances : `npm install` puis générer les icônes : `npx tauri icon app-icon.png`.
```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
brew install node
```

## 2. Lancer en développement
```bash
npm run tauri dev
```

## 3. Générer le .dmg universel
```bash
npm run tauri build -- --target universal-apple-darwin
```
Résultat : `src-tauri/target/universal-apple-darwin/release/bundle/dmg/CinéDesk_0.1.0_universal.dmg`

## 4. Signature et notarisation (pour distribuer sans alerte Gatekeeper)
Compte Apple Developer requis (99 $/an).
```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Votre Nom (TEAMID)"
export APPLE_ID="vous@email.com"
export APPLE_PASSWORD="mot-de-passe-spécifique-app"
export APPLE_TEAM_ID="TEAMID"
npm run tauri build -- --target universal-apple-darwin
```
Sans signature, le .dmg fonctionne mais l'utilisateur doit faire clic droit → Ouvrir au premier lancement.

---

# Script Doctor 100 % interne

Le Script Doctor fonctionne en deux couches, toutes deux sur le Mac de l'utilisateur, sans cloud :

1. **Moteur d'analyse intégré** (`src/lib/doctor.js`, aucune installation) : parse le scénario, calcule une courbe de tension scène par scène, détecte ventres mous, scènes trop longues, déséquilibre des actes (mur de post-it), fusils de Tchekhov oubliés ou tardifs, personnages absents ou introduits tard, tirades, répétitions, scènes « têtes parlantes », climax faible.
2. **IA locale optionnelle** (`src/lib/llm.js`) : un modèle de langage qui tourne sur la machine, pour le diagnostic qualitatif et les pistes de solutions. Le client parle l'API OpenAI-compatible, donc il marche avec Ollama ou avec `llama-server` (llama.cpp).

## Option A : Ollama (le plus simple pour tester)
```bash
brew install ollama
ollama serve &
ollama pull qwen2.5:7b        # bon en français ; 3b si Mac 8 Go de RAM
```
Autoriser l'origine de l'app : `OLLAMA_ORIGINS="tauri://localhost,http://localhost:1420" ollama serve`.
Dans `tauri.conf.json`, ajouter à `app.security.csp` : `connect-src 'self' http://127.0.0.1:11434`.

## Option B : modèle embarqué dans le .dmg (zéro installation pour l'utilisateur)
1. Compiler `llama-server` (llama.cpp, Metal activé) pour `aarch64-apple-darwin` et `x86_64-apple-darwin`.
2. Le placer dans `src-tauri/binaries/` sous les noms `llama-server-aarch64-apple-darwin` et `llama-server-x86_64-apple-darwin`.
3. Déclarer dans `tauri.conf.json` : `"bundle": { "externalBin": ["binaries/llama-server"] }`.
4. Au premier lancement, télécharger le modèle GGUF (≈ 2 à 5 Go) dans le dossier de données de l'app (ne pas le mettre dans le .dmg), puis lancer le sidecar :
   `llama-server -m <modèle.gguf> --port 8081 -c 8192`, et passer `base = "http://127.0.0.1:8081/v1"` à `llm.js`.
5. Vérifier la licence du modèle choisi avant toute distribution commerciale.

## Principe de fiabilité
Les chiffres (tension, durées, présence des personnages, objets) sont calculés par le moteur et injectés dans le prompt du modèle : l'IA commente des faits mesurés au lieu de « deviner » le scénario. Aucune solution n'est affichée ni générée sans clic explicite, et le texte de l'auteur n'est jamais modifié.
