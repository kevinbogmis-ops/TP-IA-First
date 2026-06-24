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
| 1 | creer_tache | « ajoute maquetter l'accueil dans le projet Site » | Tâche créée, statut `a_faire`, rattachée à Site (créé si absent). Apparaît dans le tableau < 3 s. | Noté. Tâche « maquetter l'accueil » ajoutée au projet Site, statut à faire. | A FAIRE |
| 2 | creer_tache (échéance) | « ajoute corriger le footer dans Site pour le 20/06/2026 » | Tâche créée avec échéance 2026-06-20. |Noté. Tâche « corriger le footer » ajoutée au projet Site, statut à faire, échéance 2026-06-20. | A FAIRE |
| 3 | lister_taches | « qu'est-ce qui est en retard ? » | Seules les tâches échéance dépassée ET statut ≠ termine. Tâches sans échéance exclues. |1 tâche(s) en retard : • « corriger le footer » [Site] — à faire, échéance 2026-06-20 — EN RETARD |EN RETARD |
| 4 | lister_taches | « montre les tâches du projet Site » | Liste filtrée sur le projet Site. | 3 tâche(s) : • « corriger le footer » [Site] — à faire, échéance 2026-06-20 — EN RETARD • « test1 » [Site] — en cours, pas d’échéance • « maquetter l'accueil » [Site] — à faire, pas d’échéance |à faire / en cours /à faire |
| 5 | changer_statut | « marque maquetter l'accueil comme terminé » | Statut → `termine`, tableau mis à jour sans recharger la page. | C’est fait : « maquetter l'accueil » est maintenant terminé. |terminé|
| 6 | changer_statut (ambigu) | « marque la tâche corriger comme en cours » (si plusieurs « corriger ») | L'assistant demande de préciser, aucune modif. |C’est fait : « corriger le footer » est maintenant en cours. |en cours |
| 7 | supprimer_tache | « supprime maquetter l'accueil » | L'assistant demande confirmation. Après « Confirmer », la tâche disparaît. | Tâche « maquetter l'accueil » supprimée. | supprimé |
| 8 | supprimer_tache (annulation) | Même phrase, puis « Annuler » | Rien n'est supprimé. |Suppression annulée. | _à remplir_ |
| 9 | decouper_tache | « découpe lancer le site en sous-tâches » | 4 à 6 sous-tâches affichées dans le chat ; aucune ligne en base. | Voici une proposition de découpage pour « lancer le site » (rien n’est enregistré) :
Vérifier que le code est complet, testé et prêt à être déployé
Configurer l’environnement serveur (choix d’hébergement, système d’exploitation, dépendances)
Déployer le code sur le serveur (via FTP, Git, CI/CD)
Configurer le domaine, le DNS et installer un certificat SSL
Tester le site en production (fonctionnalités, performance, sécurité)
Mettre en place la surveillance, les alertes et les sauvegardes régulières|  |
| 10 | hors sujet | « quel temps fait-il à Paris ? » | « je n'ai pas compris… » ; aucune action. | Je n’ai pas compris, peux-tu reformuler ? Je gère uniquement les projets et les tâches : créer, lister, changer un statut, supprimer, ou découper une tâche. | |
| 11 | cloisonnement (RLS) | Se connecter avec un 2ᵉ compte | Aucune tâche du 1ᵉʳ compte n'est visible. |vérifié| |

## Critères d'acceptation (rappel)
- Création visible dans le tableau < 3 s, projet créé si absent.
- « en retard » : échéance dépassée **et** statut ≠ termine ; sans échéance exclu.
- Changement de statut reflété sans rechargement.
- Suppression confirmée au chat ; aucune autre tâche affectée.
- Découpe : 4–6 sous-tâches, rien en base.
- Hors sujet / incompris : refus poli, aucune action.
