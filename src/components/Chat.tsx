import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import type { ChatRequest, ChatResponse, PendingConfirm } from '../../shared/api.ts';

interface Msg {
  id: number;
  role: 'user' | 'bot';
  text: string;
  suggestions?: string[];
  confirm?: PendingConfirm;
}

let seq = 0;
const nextId = () => ++seq;

async function postChat(body: ChatRequest): Promise<ChatResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as ChatResponse;
}

export function Chat({ onActionDone }: { onActionDone: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: 'bot', text: 'Bonjour. Que puis-je faire pour vous ?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  function push(m: Omit<Msg, 'id'>) {
    setMessages((prev) => [...prev, { id: nextId(), ...m }]);
  }

  function handleResponse(out: ChatResponse) {
    push({
      role: 'bot',
      text: out.reply,
      suggestions: out.suggestions,
      confirm: out.pendingConfirm,
    });
    if (out.refresh) onActionDone();
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    push({ role: 'user', text });
    setInput('');
    setBusy(true);
    try {
      handleResponse(await postChat({ message: text }));
    } catch {
      push({ role: 'bot', text: 'Connexion au serveur impossible. Réessaie ?' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(confirm: PendingConfirm) {
    if (busy) return;
    push({ role: 'user', text: 'Oui, supprimer.' });
    setBusy(true);
    try {
      handleResponse(await postChat({ confirm }));
    } catch {
      push({ role: 'bot', text: 'Connexion au serveur impossible. Réessaie ?' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat">
      <div className="chat-head">Conversation</div>
      <div className="chat-body">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <div className="bubble-text">{m.text}</div>
            {m.suggestions && (
              <ul className="suggestions">
                {m.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            {m.confirm && (
              <div className="confirm-row">
                <button className="btn-danger" onClick={() => confirmDelete(m.confirm!)}>
                  Confirmer la suppression
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => push({ role: 'bot', text: 'Suppression annulée.' })}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="loading">l’assistant écrit…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre demande…"
          disabled={busy}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={busy || !input.trim()}>
          Envoyer
        </button>
      </form>
    </section>
  );
}
