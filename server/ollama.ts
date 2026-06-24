import { env } from './env.ts';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Appelle Ollama Cloud (API native /api/chat), strictement côté serveur.
 * `json: true` demande au modèle une sortie JSON stricte (format Ollama).
 * Renvoie le contenu texte de la réponse de l'assistant.
 */
export async function callOllama(
  messages: OllamaMessage[],
  opts: { json?: boolean } = {},
): Promise<string> {
  const res = await fetch(`${env.OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      messages,
      stream: false,
      ...(opts.json ? { format: 'json' } : {}),
      options: { temperature: 0 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Ollama Cloud a répondu ${res.status} : ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
}
