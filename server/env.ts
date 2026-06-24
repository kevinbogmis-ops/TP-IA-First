import 'dotenv/config';

/** Lit une variable d'environnement obligatoire, ou échoue clairement. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        `Copiez .env.example en .env et renseignez-la.`,
    );
  }
  return v;
}

export const env = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  OLLAMA_API_KEY: required('OLLAMA_API_KEY'),
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'https://ollama.com',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  PORT: Number(process.env.PORT || 3000),
};
