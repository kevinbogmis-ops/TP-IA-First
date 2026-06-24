import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { STATUT_LABEL, type Statut } from '../../shared/intentions.ts';

interface TacheRow {
  id: string;
  titre: string;
  statut: Statut;
  echeance: string | null;
  projets: { nom: string } | null;
}

type Filtre = 'toutes' | 'a_faire' | 'en_cours' | 'en_retard';

const FILTRES: { key: Filtre; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'a_faire', label: 'À faire' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'en_retard', label: 'En retard' },
];

const today = () => new Date().toISOString().slice(0, 10);
const enRetard = (t: TacheRow) =>
  t.statut !== 'termine' && t.echeance !== null && t.echeance < today();

// Vue tableau STRICTEMENT en lecture seule. Toute modification passe par le chat.
export function TaskBoard({ refreshKey }: { refreshKey: number }) {
  const [taches, setTaches] = useState<TacheRow[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actif = true;
    setLoading(true);
    // RLS Supabase : on ne reçoit que les tâches de l'utilisateur courant.
    supabase
      .from('taches')
      .select('id, titre, statut, echeance, projets(nom)')
      .order('cree_le', { ascending: true })
      .then(({ data }) => {
        if (actif) {
          setTaches((data as TacheRow[] | null) ?? []);
          setLoading(false);
        }
      });
    return () => {
      actif = false;
    };
  }, [refreshKey]);

  const visibles = useMemo(() => {
    if (filtre === 'en_retard') return taches.filter(enRetard);
    if (filtre === 'a_faire') return taches.filter((t) => t.statut === 'a_faire');
    if (filtre === 'en_cours') return taches.filter((t) => t.statut === 'en_cours');
    return taches;
  }, [taches, filtre]);

  // Regroupement par projet.
  const parProjet = useMemo(() => {
    const map = new Map<string, TacheRow[]>();
    for (const t of visibles) {
      const nom = t.projets?.nom ?? 'Sans projet';
      (map.get(nom) ?? map.set(nom, []).get(nom)!).push(t);
    }
    return [...map.entries()];
  }, [visibles]);

  return (
    <section className="board">
      <div className="board-head">Mes tâches</div>
      <div className="board-filters">
        {FILTRES.map((f) => (
          <button
            key={f.key}
            className={`chip ${filtre === f.key ? 'active' : ''}`}
            onClick={() => setFiltre(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="board-body">
        {loading ? (
          <div className="board-empty">Chargement…</div>
        ) : parProjet.length === 0 ? (
          <div className="board-empty">
            Aucune tâche. Demande-en une dans le chat, par exemple :
            <br />« ajoute une tâche maquetter l’accueil dans le projet Site ».
          </div>
        ) : (
          parProjet.map(([projet, items]) => (
            <div key={projet} className="board-group">
              <div className="group-title">Projet · {projet}</div>
              {items.map((t) => (
                <div key={t.id} className="task-row">
                  <span className="task-main">
                    <strong>{t.titre}</strong>
                    <span className="task-ech">
                      {t.echeance ? ` · échéance ${t.echeance}` : ' · pas d’échéance'}
                    </span>
                  </span>
                  {enRetard(t) ? (
                    <span className="tag tag-danger">en retard</span>
                  ) : (
                    <span className="tag">{STATUT_LABEL[t.statut]}</span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
