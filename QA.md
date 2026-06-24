# QA.md — Cahier de recette

On déroule les 5 intentions une par une depuis le chat, plus le cas « hors sujet ».
On note l'écart entre l'attendu et l'obtenu. Les anomalies bloquantes sont corrigées
avant de livrer ; les anomalies cosmétiques sont tracées dans `PROMPTS.md`.

> Statut : à remplir en fin de séance pendant la recette manuelle (les cellules
> « Obtenu / Statut » sont à compléter en cochant le comportement réel observé).

## Pré-requis de recette
- Schéma `supabase/schema.sql` exécuté.
- `.env` renseigné (Supabase + Ollama).
- `npm run dev` lancé, compte créé et connecté.

## Tests automatisés (Vitest)
`npm test` → 9 tests verts : une intention par cas (5), un message hors sujet rejeté,
un statut hors énum rejeté, une sortie non-JSON tolérée. L'appel Ollama est mocké.

## Recette manuelle

| # | Intention | Phrase testée | Attendu | Obtenu | Statut |
| --- | --- | --- | --- | --- | --- |
| 1 | creer_tache | « ajoute maquetter l'accueil dans le projet Site » | Tâche créée, statut `a_faire`, rattachée à Site (créé si absent). Apparaît dans le tableau < 3 s. | _à remplir_ | _à remplir_ |
| 2 | creer_tache (échéance) | « ajoute corriger le footer dans Site pour le 20/06/2026 » | Tâche créée avec échéance 2026-06-20. | _à remplir_ | _à remplir_ |
| 3 | lister_taches | « qu'est-ce qui est en retard ? » | Seules les tâches échéance dépassée ET statut ≠ termine. Tâches sans échéance exclues. | _à remplir_ | _à remplir_ |
| 4 | lister_taches | « montre les tâches du projet Site » | Liste filtrée sur le projet Site. | _à remplir_ | _à remplir_ |
| 5 | changer_statut | « marque maquetter l'accueil comme terminé » | Statut → `termine`, tableau mis à jour sans recharger la page. | _à remplir_ | _à remplir_ |
| 6 | changer_statut (ambigu) | « marque la tâche corriger comme en cours » (si plusieurs « corriger ») | L'assistant demande de préciser, aucune modif. | _à remplir_ | _à remplir_ |
| 7 | supprimer_tache | « supprime maquetter l'accueil » | L'assistant demande confirmation. Après « Confirmer », la tâche disparaît. | _à remplir_ | _à remplir_ |
| 8 | supprimer_tache (annulation) | Même phrase, puis « Annuler » | Rien n'est supprimé. | _à remplir_ | _à remplir_ |
| 9 | decouper_tache | « découpe lancer le site en sous-tâches » | 4 à 6 sous-tâches affichées dans le chat ; aucune ligne en base. | _à remplir_ | _à remplir_ |
| 10 | hors sujet | « quel temps fait-il à Paris ? » | « je n'ai pas compris… » ; aucune action. | _à remplir_ | _à remplir_ |
| 11 | cloisonnement (RLS) | Se connecter avec un 2ᵉ compte | Aucune tâche du 1ᵉʳ compte n'est visible. | _à remplir_ | _à remplir_ |

## Critères d'acceptation (rappel)
- Création visible dans le tableau < 3 s, projet créé si absent.
- « en retard » : échéance dépassée **et** statut ≠ termine ; sans échéance exclu.
- Changement de statut reflété sans rechargement.
- Suppression confirmée au chat ; aucune autre tâche affectée.
- Découpe : 4–6 sous-tâches, rien en base.
- Hors sujet / incompris : refus poli, aucune action.
