import type { Request, Response } from 'express';
import { getUserIdFromToken } from './supabase.ts';
import { interpret } from './interpret.ts';
import { executeAction, confirmerSuppression } from './actions.ts';
import type { ChatRequest, ChatResponse } from '../shared/api.ts';

const INCOMPRIS: ChatResponse = {
  reply:
    'Je n’ai pas compris, peux-tu reformuler ? Je gère uniquement les projets et ' +
    'les tâches : créer, lister, changer un statut, supprimer, ou découper une tâche.',
};

export async function chatHandler(req: Request, res: Response): Promise<void> {
  // user_id forcé côté serveur depuis la session, jamais lu du corps de requête.
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const userId = await getUserIdFromToken(token);
  if (!userId) {
    res.status(401).json({ reply: 'Session expirée. Reconnecte-toi.' });
    return;
  }

  const body = req.body as ChatRequest;

  // Chemin « confirmation de suppression » : exécution directe, sans modèle.
  if (body.confirm?.type === 'supprimer_tache' && body.confirm.tacheId) {
    const out = await confirmerSuppression(userId, body.confirm);
    res.json(out);
    return;
  }

  const message = (body.message ?? '').trim();
  if (!message) {
    res.status(400).json({ reply: 'Message vide.' });
    return;
  }

  // Interprétation (Ollama) puis validation Zod. Hors schéma => rien n'est exécuté.
  const result = await interpret(message);
  if (!result.valide) {
    res.json(INCOMPRIS);
    return;
  }

  const { valide: _v, ...action } = result;
  const out = await executeAction(userId, action);
  res.json(out);
}
