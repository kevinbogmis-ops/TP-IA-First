# Assistant de tâches d'équipe — IA-first

Application **IA-first** de gestion de tâches d'équipe. Le **chat est le seul point
d'entrée des actions**, doublé d'une **vue tableau en lecture seule**. Pas de
formulaire de saisie : on écrit en langage naturel, un modèle interprète la demande,
le serveur la valide puis l'exécute.

- **Front** : React + Vite (TypeScript)
- **Backend** : Express (route `/api/chat`) + Supabase (Postgres + Auth, RLS activée)
- **IA** : Ollama Cloud, appelé **uniquement côté serveur**. Mécanique intention →
  action en **JSON structuré**, validée par **Zod** avant toute exécution.
- **Tests** : Vitest

La doc de conception complète est dans [`doc-conception/`](doc-conception/index.html).

---

## Démarrage rapide (< 5 min)

### 1. Prérequis
- Node.js ≥ 18 (testé sur Node 24)
- Un projet [Supabase](https://supabase.com) (gratuit)
- Une clé Ollama Cloud (fournie par l'intervenant)

### 2. Installer
```bash
npm install
```

### 3. Créer le schéma de base
Dans Supabase → **SQL Editor** → New query, colle le contenu de
[`supabase/schema.sql`](supabase/schema.sql) puis **Run**.
Cela crée les tables `projets` et `taches`, le type `statut_tache`, et les
**policies RLS** (chacun ne voit que ses données).

### 4. Configurer les secrets
```bash
cp .env.example .env
```
Renseigne `.env` :

| Variable | Où la trouver |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | … → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | … → API → `service_role` (**secret, côté serveur**) |
| `OLLAMA_API_KEY` | fournie par l'intervenant |
| `OLLAMA_MODEL` | par défaut `qwen2.5:7b` |

> Les variables `VITE_*` sont les seules exposées au navigateur : elles ne
> contiennent que des valeurs **publiques**. La clé `service_role` et la clé
> Ollama n'ont jamais ce préfixe et restent côté serveur.

### 5. Lancer
```bash
npm run dev
```
- Front : http://localhost:5173
- API : http://localhost:3000 (proxifiée derrière `/api`)

Crée un compte depuis l'écran de connexion, puis discute avec l'assistant.

> **Auth e-mail** : si tu veux te connecter sans confirmation par e-mail, désactive
> « Confirm email » dans Supabase → Authentication → Providers → Email.

---

## Ce qu'on peut demander (5 intentions)

| Exemple | Effet |
| --- | --- |
| « ajoute une tâche maquetter l'accueil dans le projet Site » | Crée la tâche (et le projet s'il n'existe pas) |
| « qu'est-ce qui est en retard ? » | Liste les tâches en retard |
| « marque maquetter l'accueil comme terminé » | Change le statut |
| « supprime la tâche maquetter l'accueil » | Supprime (après confirmation au chat) |
| « découpe la tâche lancer le site en sous-tâches » | Suggère 4–6 sous-tâches (rien en base) |

Un message hors sujet (« quel temps fait-il ? ») est poliment refusé : aucune action.

---

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Lance le front (Vite) **et** l'API (Express) ensemble |
| `npm run build` | Typecheck + build de production du front |
| `npm test` | Lance les tests Vitest |
| `npm run typecheck` | Vérifie les types sans émettre |

---

## Sécurité

- **RLS Supabase** : chaque ligne porte `user_id` ; policy `user_id = auth.uid()`.
- **`user_id` forcé côté serveur** depuis la session vérifiée, jamais lu du message.
- **Secrets** (`service_role`, Ollama) strictement côté serveur, jamais exposés.
- **Validation** : toute sortie du modèle passe par le schéma **Zod** ; hors schéma →
  rejet, aucune action exécutée.

Détails dans `doc-conception/` (page 03 · Sécurité).

---

## Structure

```
server/        API Express : /api/chat, interprétation, actions, Supabase admin
  interpret.ts   message -> { intention, params }, validé par Zod
  actions.ts     exécution des 5 intentions
  ollama.ts      appel Ollama Cloud (côté serveur uniquement)
shared/        Code partagé front/serveur (schéma Zod, contrats d'API)
src/           Front React : Auth, Chat, TaskBoard (lecture seule)
supabase/      schema.sql (tables + RLS)
test/          Tests Vitest (interprétation)
doc-conception/ Doc de conception (5 pages)
```
