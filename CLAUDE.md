# CLAUDE.md — Mémoire du projet

Ce fichier est lu par l'agent de codage au démarrage. Il décrit quoi construire,
avec quelles contraintes, et comment travailler. La doc de conception complète est
dans `doc-conception/` (5 pages HTML).

## Le projet en une phrase

Une application **IA-first** de gestion de tâches d'équipe : le **chat est le seul
point d'entrée des actions**, doublé d'une **vue tableau en lecture seule**. Pas de
formulaire de saisie.

## Stack imposée

- **Frontend** : React + Vite (TypeScript).
- **Backend** : Supabase (Postgres + Auth). RLS activée sur toutes les tables.
- **IA générative** : Ollama Cloud, appelé **uniquement côté serveur** via une route
  `/api/chat`. Mécanique intention → action en **JSON structuré** (pas de tool calling).
- **Validation** : Zod, côté serveur, avant toute exécution d'action.
- **Tests** : Vitest.

## Modèle métier (2 entités)

**Projet** : `id` (uuid), `nom` (text), `user_id` (uuid), `cree_le` (timestamp).

**Tâche** : `id` (uuid), `projet_id` (uuid, FK Projet), `titre` (text),
`statut` (enum : `a_faire` | `en_cours` | `termine`), `echeance` (date, nullable),
`user_id` (uuid), `cree_le` (timestamp).

Relation : un Projet a 0..N Tâches ; une Tâche appartient à 1 Projet
(`on delete cascade`).

Une tâche est **en retard** si `echeance < aujourd'hui` ET `statut != termine`.

## Catalogue d'intentions (5)

L'utilisateur écrit en langage naturel. Ollama renvoie `{ intention, params }`.
Le serveur valide avec Zod, puis exécute.

1. `creer_tache` — params : `titre`, `nom_projet`, `echeance?`. Crée le projet s'il n'existe pas. → INSERT Tâche.
2. `lister_taches` — params : `filtre` (`en_retard` | `par_projet` | `par_statut` | `toutes`), `nom_projet?`, `statut?`. → SELECT filtré.
3. `changer_statut` — params : `titre_tache`, `nouveau_statut`. → UPDATE statut.
4. `supprimer_tache` — params : `titre_tache`. → DELETE (avec confirmation au chat).
5. `decouper_tache` (**générative**) — params : `titre_tache`. Appelle Ollama pour
   suggérer 4 à 6 sous-tâches, **affichées dans le chat, rien en base**.

Les tâches sont désignées par leur titre (pas par id) : faire une recherche par titre
sur les tâches de l'utilisateur courant. Si plusieurs correspondent, demander de préciser.

## Sécurité (non négociable)

- **Cloisonnement** : chaque ligne porte `user_id`. RLS Supabase :
  `using (user_id = auth.uid())`. Le SQL complet est dans `doc-conception/03-securite.html`.
- **`user_id` forcé côté serveur** depuis la session. JAMAIS lu depuis le message utilisateur.
- **Secrets** : `OLLAMA_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` restent côté serveur,
  jamais exposés au navigateur. Voir `.env.example`.
- **Anti-injection** : toute sortie du modèle passe par le schéma Zod. Intention ou
  paramètre hors schéma → rejet, l'assistant répond « je n'ai pas compris, peux-tu
  reformuler ? » et n'exécute rien.

## Livrables attendus (rappel barème)

Dépôt Git public, lançable en local en < 5 min :
`README.md` (démarrage rapide), `.env.example`, `.gitignore` (ignore `.env`, `node_modules`),
les tests Vitest, `QA.md` (cahier de recette), `PROMPTS.md`, la doc `doc-conception/`.

## Méthode de travail

- Procède **intention par intention**. Une intention qui marche vaut mieux que trois
  bâclées. Commence par câbler Supabase + Auth + la route `/api/chat`, puis ajoute
  les intentions une à une en testant à chaque fois.
- Commits réguliers et petits, messages clairs.
- Préfère la simplicité : pas de dépendance exotique, pas d'abstraction prématurée.
- Quand un choix est ambigu, signale-le plutôt que de deviner en silence.

## Journal des interactions (PROMPTS.md)

À chaque demande significative que je te fais, ajoute une entrée datée
dans le fichier PROMPTS.md, à la racine du dépôt, sous la forme :

### YYYY-MM-DD HH:MM · résumé court

- Demande : (ma demande textuelle ou son intention)
- Action : (ce que tu as fait, fichiers touchés)
- Résultat : OK / KO + brève raison
- Si KO : cause identifiée, correction appliquée

Tiens ce journal de toi-même, sans que j'aie à le demander.
