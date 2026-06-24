import { createClient } from '@supabase/supabase-js';

// Client navigateur : clé publique (anon) uniquement. La RLS protège les données.
// Aucune clé service role ni clé Ollama ne doit jamais atterrir ici.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquent. ' +
      'Copiez .env.example en .env et renseignez-les.',
  );
}

export const supabase = createClient(url, anonKey);
