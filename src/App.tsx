import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase.ts';
import { Auth } from './components/Auth.tsx';
import { Chat } from './components/Chat.tsx';
import { TaskBoard } from './components/TaskBoard.tsx';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Compteur incrémenté après chaque action réussie au chat : force le tableau
  // à se recharger sans recharger la page.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="centered">Chargement…</div>;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Assistant · Tâches d’équipe
        </div>
        <div className="topbar-right">
          <span className="user-email">{session.user.email}</span>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="main-grid">
        <Chat onActionDone={refresh} />
        <TaskBoard refreshKey={refreshKey} />
      </main>
    </div>
  );
}
