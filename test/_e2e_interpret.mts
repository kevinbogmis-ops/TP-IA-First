import { interpret } from '../server/interpret.ts';

const cas = [
  'bonjour',
  'ajoute une tâche test1 dans le projet Site',
  'crée la tâche maquetter l\'accueil dans le projet Site pour demain',
  'quelles sont mes tâches en retard',
  'montre toutes mes tâches',
  'liste les tâches du projet Site',
  'passe la tâche test1 en cours',
  'marque test1 comme terminé',
  'supprime la tâche test1',
  'découpe la tâche refondre le site',
  'quel temps fait-il à Paris ?',
];

for (const m of cas) {
  const r = await interpret(m, '2026-06-24');
  console.log(`\n> ${m}`);
  console.log(JSON.stringify(r));
}
