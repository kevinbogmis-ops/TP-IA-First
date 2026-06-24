import express from 'express';
import { env } from './env.ts';
import { chatHandler } from './chat.ts';

const app = express();
app.use(express.json());

// Petit point de santé, pratique pour vérifier que l'API tourne.
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Seul point d'entrée des actions : le chat.
app.post('/api/chat', (req, res) => {
  chatHandler(req, res).catch((err) => {
    console.error('Erreur /api/chat :', err);
    if (!res.headersSent) {
      res.status(500).json({ reply: 'Une erreur est survenue côté serveur.' });
    }
  });
});

app.listen(env.PORT, () => {
  console.log(`API prête sur http://localhost:${env.PORT}`);
});
