import { createClient } from '@supabase/supabase-js';
import { env } from './env.ts';

// Client serveur avec la clé service role. JAMAIS exposé au navigateur.
// Il sert à : (1) vérifier le jeton de session de l'utilisateur,
// (2) exécuter les écritures en forçant le user_id depuis la session.
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Vérifie le jeton d'accès envoyé par le front et renvoie l'id utilisateur.
 * Le user_id ne vient JAMAIS du corps de la requête : il est dérivé ici, de
 * la session vérifiée côté serveur.
 */
export async function getUserIdFromToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
