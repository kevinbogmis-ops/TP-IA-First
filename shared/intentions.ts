import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════
//  Catalogue d'intentions + schéma de validation (Zod).
//  Partagé entre le serveur (validation avant exécution) et les tests.
//  TOUTE sortie du modèle passe par ce schéma : une intention ou un
//  paramètre hors schéma est rejeté, rien n'est exécuté.
// ════════════════════════════════════════════════════════════════════

export const STATUTS = ['a_faire', 'en_cours', 'termine'] as const;
export type Statut = (typeof STATUTS)[number];

export const FILTRES = ['en_retard', 'par_projet', 'par_statut', 'toutes'] as const;
export type Filtre = (typeof FILTRES)[number];

export const ActionSchema = z.discriminatedUnion('intention', [
  z.object({
    intention: z.literal('creer_tache'),
    params: z.object({
      titre: z.string().min(1).max(120),
      nom_projet: z.string().min(1).max(80),
      echeance: z.string().date().optional(),
    }),
  }),
  z.object({
    intention: z.literal('lister_taches'),
    params: z.object({
      filtre: z.enum(FILTRES),
      nom_projet: z.string().optional(),
      statut: z.enum(STATUTS).optional(),
    }),
  }),
  z.object({
    intention: z.literal('changer_statut'),
    params: z.object({
      titre_tache: z.string().min(1),
      nouveau_statut: z.enum(STATUTS),
    }),
  }),
  z.object({
    intention: z.literal('supprimer_tache'),
    params: z.object({ titre_tache: z.string().min(1) }),
  }),
  z.object({
    intention: z.literal('decouper_tache'),
    params: z.object({ titre_tache: z.string().min(1) }),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;
export type Intention = Action['intention'];

/** Résultat de l'interprétation d'un message utilisateur. */
export type InterpretResult =
  | ({ valide: true } & Action)
  | { valide: false; raison: string };

/** Libellés FR des statuts, pour les réponses de l'assistant. */
export const STATUT_LABEL: Record<Statut, string> = {
  a_faire: 'à faire',
  en_cours: 'en cours',
  termine: 'terminé',
};
