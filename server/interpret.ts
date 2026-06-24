import { ActionSchema, type InterpretResult } from '../shared/intentions.ts';
import { callOllama } from './ollama.ts';

/**
 * Construit le prompt système qui contraint le modèle à renvoyer une action
 * structurée. Le modèle ne décide JAMAIS de l'exécution : il propose une
 * intention, que le serveur valide ensuite avec Zod.
 */
function systemPrompt(today: string): string {
  return `Tu es l'analyseur d'intentions d'un assistant de gestion de tâches d'équipe.
Tu transformes le message de l'utilisateur en UNE action JSON, et rien d'autre.

Réponds STRICTEMENT avec un objet JSON { "intention": ..., "params": { ... } }.
N'ajoute aucun texte, aucune explication, aucun markdown.

Intentions possibles et leurs params :
1. "creer_tache"      -> { "titre": string, "nom_projet": string, "echeance"?: "YYYY-MM-DD" }
2. "lister_taches"    -> { "filtre": "en_retard"|"par_projet"|"par_statut"|"toutes", "nom_projet"?: string, "statut"?: "a_faire"|"en_cours"|"termine" }
3. "changer_statut"   -> { "titre_tache": string, "nouveau_statut": "a_faire"|"en_cours"|"termine" }
4. "supprimer_tache"  -> { "titre_tache": string }
5. "decouper_tache"   -> { "titre_tache": string }

Règles :
- La date du jour est ${today}. Convertis toute échéance relative ("demain", "vendredi", "dans 3 jours") en date absolue "YYYY-MM-DD". Si aucune échéance n'est mentionnée, n'inclus pas le champ "echeance".
- "en retard" / "dépassé" -> filtre "en_retard". "toutes mes tâches" -> "toutes". Un nom de projet précisé -> "par_projet". Un statut précisé -> "par_statut".
- Statuts : "à faire"->"a_faire", "en cours"->"en_cours", "terminé"/"fait"->"termine".
- Si le message ne correspond à AUCUNE de ces intentions (météo, traduction, question générale, bavardage), réponds exactement : { "intention": "inconnue", "params": {} }.`;
}

/**
 * Interprète un message en langage naturel.
 * - Appelle Ollama (mockable dans les tests via le module ./ollama).
 * - Parse le JSON, puis valide avec le schéma Zod.
 * - Toute sortie hors schéma => { valide: false }, aucune action n'est exécutée.
 */
export async function interpret(
  message: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<InterpretResult> {
  let raw: string;
  try {
    raw = await callOllama(
      [
        { role: 'system', content: systemPrompt(today) },
        { role: 'user', content: message },
      ],
      { json: true },
    );
  } catch {
    return { valide: false, raison: 'appel au modèle impossible' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valide: false, raison: 'sortie du modèle non-JSON' };
  }

  const result = ActionSchema.safeParse(parsed);
  if (!result.success) {
    return { valide: false, raison: 'intention ou paramètres hors schéma' };
  }

  return { valide: true, ...result.data };
}
