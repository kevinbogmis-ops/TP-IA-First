import { useState } from 'react';
import { supabase } from '../lib/supabase.ts';

// Auth minimale e-mail / mot de passe. Inscription ou connexion.
export function Auth() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fn =
      mode === 'connexion'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      setMsg(error.message);
    } else if (mode === 'inscription') {
      setMsg('Compte créé. Si la confirmation e-mail est activée, vérifie ta boîte mail, sinon connecte-toi.');
    }
  }

  return (
    <div className="centered">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-mark" />
          Assistant · Tâches d’équipe
        </div>
        <p className="auth-sub">
          {mode === 'connexion' ? 'Connecte-toi pour piloter tes tâches.' : 'Crée ton compte.'}
        </p>

        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
          />
        </label>

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
        </button>

        {msg && <p className="auth-msg">{msg}</p>}

        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setMode(mode === 'connexion' ? 'inscription' : 'connexion');
            setMsg(null);
          }}
        >
          {mode === 'connexion' ? 'Pas de compte ? S’inscrire' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  );
}
