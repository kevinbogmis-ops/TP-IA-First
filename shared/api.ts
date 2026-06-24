// Contrat d'échange entre le front et la route /api/chat.

/** Action de suppression en attente de confirmation explicite au chat. */
export interface PendingConfirm {
  type: 'supprimer_tache';
  tacheId: string;
  titre: string;
}

/** Corps d'une requête POST /api/chat. */
export interface ChatRequest {
  message?: string;
  /** Renvoyé tel quel par le front quand l'utilisateur confirme une suppression. */
  confirm?: PendingConfirm;
}

/** Réponse de l'assistant renvoyée au front. */
export interface ChatResponse {
  /** Texte affiché dans la bulle de l'assistant. */
  reply: string;
  /** Présent quand une suppression attend une confirmation. */
  pendingConfirm?: PendingConfirm;
  /** Sous-tâches suggérées (intention decouper_tache) — rien en base. */
  suggestions?: string[];
  /** true si la vue tableau doit être rechargée (création/maj/suppression). */
  refresh?: boolean;
}
