import { describe, test, expect, vi, beforeEach } from 'vitest';

// On mocke l'appel à Ollama Cloud : les tests sont rapides et déterministes.
// On ne teste PAS la qualité du modèle, mais que sa sortie est correctement
// parsée et validée par le schéma Zod.
vi.mock('../server/ollama.ts', () => ({
  callOllama: vi.fn(),
}));

import { callOllama } from '../server/ollama.ts';
import { interpret } from '../server/interpret.ts';

const mockOllama = vi.mocked(callOllama);

/** Fait répondre le modèle mocké avec un JSON donné. */
function modelReturns(obj: unknown) {
  mockOllama.mockResolvedValueOnce(JSON.stringify(obj));
}

beforeEach(() => mockOllama.mockReset());

describe('interpret() — une intention par cas + un message hors sujet', () => {
  test('creer_tache parse une demande basique', async () => {
    modelReturns({
      intention: 'creer_tache',
      params: { titre: "maquetter l'accueil", nom_projet: 'Site' },
    });
    const r = await interpret("ajoute une tâche maquetter l'accueil dans le projet Site");
    expect(r.valide).toBe(true);
    if (!r.valide || r.intention !== 'creer_tache') throw new Error('mauvaise intention');
    expect(r.params.titre).toMatch(/maquetter/i);
    expect(r.params.nom_projet).toMatch(/site/i);
  });

  test('creer_tache accepte une échéance ISO', async () => {
    modelReturns({
      intention: 'creer_tache',
      params: { titre: 'relire les specs', nom_projet: 'App', echeance: '2026-06-30' },
    });
    const r = await interpret('ajoute relire les specs dans App pour le 30 juin');
    expect(r.valide).toBe(true);
    if (!r.valide || r.intention !== 'creer_tache') throw new Error('mauvaise intention');
    expect(r.params.echeance).toBe('2026-06-30');
  });

  test('lister_taches reconnaît le filtre en_retard', async () => {
    modelReturns({ intention: 'lister_taches', params: { filtre: 'en_retard' } });
    const r = await interpret("qu'est-ce qui est en retard ?");
    expect(r.valide).toBe(true);
    if (!r.valide || r.intention !== 'lister_taches') throw new Error('mauvaise intention');
    expect(r.params.filtre).toBe('en_retard');
  });

  test('changer_statut parse la cible et le nouveau statut', async () => {
    modelReturns({
      intention: 'changer_statut',
      params: { titre_tache: "maquetter l'accueil", nouveau_statut: 'termine' },
    });
    const r = await interpret("marque maquetter l'accueil comme terminé");
    expect(r.valide).toBe(true);
    if (!r.valide || r.intention !== 'changer_statut') throw new Error('mauvaise intention');
    expect(r.params.nouveau_statut).toBe('termine');
  });

  test('supprimer_tache parse le titre ciblé', async () => {
    modelReturns({
      intention: 'supprimer_tache',
      params: { titre_tache: "maquetter l'accueil" },
    });
    const r = await interpret("supprime la tâche maquetter l'accueil");
    expect(r.valide).toBe(true);
    if (!r.valide) return;
    expect(r.intention).toBe('supprimer_tache');
  });

  test('decouper_tache (générative) parse le titre', async () => {
    modelReturns({
      intention: 'decouper_tache',
      params: { titre_tache: 'lancer le site' },
    });
    const r = await interpret('découpe la tâche lancer le site en sous-tâches');
    expect(r.valide).toBe(true);
    if (!r.valide) return;
    expect(r.intention).toBe('decouper_tache');
  });

  test('un message hors sujet est rejeté', async () => {
    // Le modèle renvoie une intention inconnue : le schéma Zod la rejette.
    modelReturns({ intention: 'inconnue', params: {} });
    const r = await interpret('quel temps fait-il à Paris ?');
    expect(r.valide).toBe(false);
  });

  test('un statut hors énum est rejeté (anti-injection)', async () => {
    modelReturns({
      intention: 'changer_statut',
      params: { titre_tache: 'x', nouveau_statut: 'DROP TABLE' },
    });
    const r = await interpret('passe x au statut bidon');
    expect(r.valide).toBe(false);
  });

  test('une sortie non-JSON est rejetée sans planter', async () => {
    mockOllama.mockResolvedValueOnce('je ne sais pas trop');
    const r = await interpret('blabla');
    expect(r.valide).toBe(false);
  });
});
