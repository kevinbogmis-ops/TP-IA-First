# PROMPTS.md — Journal des interactions

Journal daté des demandes significatives et des actions correspondantes.

### 2026-06-24 17:56 · Le chat répond « je n'ai pas compris » à tout

- **Demande** : capture d'écran montrant que chaque message du chat (« bonjour »,
  « ajoute une tâche test1 dans le projet Site », etc.) renvoie le message
  d'incompréhension. Diagnostiquer et corriger.
- **Action** : test direct de l'API Ollama Cloud → `model 'qwen2.5:7b' not found`
  (HTTP 404). Ce modèle n'est pas hébergé sur Ollama Cloud, donc `callOllama` lève,
  `interpret` renvoie `valide: false`, et `/api/chat` répond INCOMPRIS pour TOUT
  message. Listé les modèles du compte (`/api/tags`), validé `gpt-oss:20b` en mode
  `format: json` (réponse JSON propre). Changé `OLLAMA_MODEL` dans `.env` :
  `qwen2.5:7b` → `gpt-oss:20b`.
- **Résultat** : OK (cause corrigée). Nécessite de **relancer `npm run dev`** :
  `tsx watch` ne recharge pas sur changement de `.env`. NB : « bonjour » → INCOMPRIS
  reste le comportement attendu (intention « inconnue », hors schéma).

### 2026-06-24 17:25 · Scaffolding complet + fondation + 5 intentions

- **Demande** : « superbase ok » — Supabase prêt (clés API), lancer la construction
  de l'application. Choix confirmés : Express + Vite lancés ensemble ; je fournis
  tout le SQL et la config ; clé Ollama Cloud disponible.
- **Action** :
  - Scaffolding : `package.json`, `tsconfig*.json`, `vite.config.ts`, `.gitignore`,
    `.env.example`, `index.html`. Déplacé la doc dans `doc-conception/index.html`.
  - SQL : `supabase/schema.sql` (tables `projets`/`taches`, enum `statut_tache`,
    RLS `user_id = auth.uid()`), idempotent.
  - Partagé : `shared/intentions.ts` (schéma Zod des 5 intentions), `shared/api.ts`
    (contrats `/api/chat`).
  - Serveur : `server/env.ts`, `server/supabase.ts` (admin + vérif du jeton),
    `server/ollama.ts` (appel Ollama Cloud côté serveur), `server/interpret.ts`
    (message → action validée Zod), `server/actions.ts` (les 5 intentions +
    confirmation de suppression + recherche par titre / désambiguïsation),
    `server/chat.ts`, `server/index.ts`.
  - Front : `src/lib/supabase.ts` (anon), `App.tsx`, `components/Auth.tsx`,
    `Chat.tsx`, `TaskBoard.tsx` (lecture seule, filtres, tag « en retard »),
    `styles.css`.
  - Tests : `test/interpret.test.ts` (9 tests, Ollama mocké).
  - Livrables : `README.md`, `QA.md`, ce journal.
- **Résultat** : OK. `npx tsc -b` passe sans erreur ; `npm test` → 9/9 verts.
  Reste à l'utilisateur : renseigner `.env`, exécuter le SQL, `npm run dev` pour la
  recette manuelle (QA.md).
