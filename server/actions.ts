import { supabaseAdmin } from './supabase.ts';
import { callOllama } from './ollama.ts';
import {
  STATUT_LABEL,
  type Action,
  type Filtre,
  type Statut,
} from '../shared/intentions.ts';
import type { ChatResponse, PendingConfirm } from '../shared/api.ts';

interface Tache {
  id: string;
  titre: string;
  statut: Statut;
  echeance: string | null;
  projet_id: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Une tâche est en retard si l'échéance est passée et le statut n'est pas terminé. */
function enRetard(t: Pick<Tache, 'statut' | 'echeance'>): boolean {
  return t.statut !== 'termine' && t.echeance !== null && t.echeance < today();
}

function formatEcheance(e: string | null): string {
  return e ? `échéance ${e}` : 'pas d’échéance';
}

// ── Recherche d'une tâche par titre, dans le périmètre de l'utilisateur ──────
// Les tâches sont désignées par leur titre (jamais par id). Si plusieurs
// correspondent, on demande à l'utilisateur de préciser.
async function trouverTaches(userId: string, titre: string): Promise<Tache[]> {
  const { data } = await supabaseAdmin
    .from('taches')
    .select('id, titre, statut, echeance, projet_id')
    .eq('user_id', userId)
    .ilike('titre', `%${titre}%`);
  return (data as Tache[] | null) ?? [];
}

function ambiguite(titre: string, matches: Tache[]): ChatResponse {
  const liste = matches.map((t) => `« ${t.titre} »`).join(', ');
  return {
    reply:
      `Plusieurs tâches correspondent à « ${titre} » : ${liste}. ` +
      `Peux-tu préciser le titre exact ?`,
  };
}

// ════════════════════════════════════════════════════════════════════
//  1. creer_tache — crée le projet s'il n'existe pas, puis insère la tâche.
// ════════════════════════════════════════════════════════════════════
async function creerTache(
  userId: string,
  params: Extract<Action, { intention: 'creer_tache' }>['params'],
): Promise<ChatResponse> {
  // Projet existant (insensible à la casse) ou création.
  const { data: existant } = await supabaseAdmin
    .from('projets')
    .select('id, nom')
    .eq('user_id', userId)
    .ilike('nom', params.nom_projet)
    .limit(1)
    .maybeSingle();

  let projetId = existant?.id as string | undefined;
  let nomProjet = existant?.nom as string | undefined;

  if (!projetId) {
    const { data: cree, error } = await supabaseAdmin
      .from('projets')
      .insert({ nom: params.nom_projet, user_id: userId })
      .select('id, nom')
      .single();
    if (error || !cree) {
      return { reply: 'Je n’ai pas pu créer le projet. Réessaie ?' };
    }
    projetId = cree.id;
    nomProjet = cree.nom;
  }

  const { error } = await supabaseAdmin.from('taches').insert({
    titre: params.titre,
    projet_id: projetId,
    echeance: params.echeance ?? null,
    user_id: userId,
  });
  if (error) return { reply: 'Je n’ai pas pu créer la tâche. Réessaie ?' };

  const ech = params.echeance ? `, échéance ${params.echeance}` : '';
  const nouveau = existant ? '' : ' (nouveau projet)';
  return {
    reply: `Noté. Tâche « ${params.titre} » ajoutée au projet ${nomProjet}${nouveau}, statut à faire${ech}.`,
    refresh: true,
  };
}

// ════════════════════════════════════════════════════════════════════
//  2. lister_taches — SELECT filtré, restitué en texte dans le chat.
// ════════════════════════════════════════════════════════════════════
async function listerTaches(
  userId: string,
  params: Extract<Action, { intention: 'lister_taches' }>['params'],
): Promise<ChatResponse> {
  // On récupère les tâches de l'utilisateur + le nom de leur projet.
  const { data } = await supabaseAdmin
    .from('taches')
    .select('id, titre, statut, echeance, projet_id, projets(nom)')
    .eq('user_id', userId)
    .order('echeance', { ascending: true, nullsFirst: false });

  type Row = Tache & { projets: { nom: string } | null };
  let rows = ((data as Row[] | null) ?? []);
  const filtre: Filtre = params.filtre;

  if (filtre === 'en_retard') {
    rows = rows.filter(enRetard);
  } else if (filtre === 'par_statut' && params.statut) {
    rows = rows.filter((t) => t.statut === params.statut);
  } else if (filtre === 'par_projet' && params.nom_projet) {
    const cible = params.nom_projet.toLowerCase();
    rows = rows.filter((t) => (t.projets?.nom ?? '').toLowerCase().includes(cible));
  }

  if (rows.length === 0) {
    return { reply: 'Aucune tâche ne correspond à cette demande.' };
  }

  const lignes = rows.map((t) => {
    const tag = enRetard(t) ? ' — EN RETARD' : '';
    const projet = t.projets?.nom ? ` [${t.projets.nom}]` : '';
    return `• « ${t.titre} »${projet} — ${STATUT_LABEL[t.statut]}, ${formatEcheance(t.echeance)}${tag}`;
  });

  const intro =
    filtre === 'en_retard'
      ? `${rows.length} tâche(s) en retard :`
      : `${rows.length} tâche(s) :`;
  return { reply: `${intro}\n${lignes.join('\n')}` };
}

// ════════════════════════════════════════════════════════════════════
//  3. changer_statut — UPDATE du statut de la tâche ciblée par titre.
// ════════════════════════════════════════════════════════════════════
async function changerStatut(
  userId: string,
  params: Extract<Action, { intention: 'changer_statut' }>['params'],
): Promise<ChatResponse> {
  const matches = await trouverTaches(userId, params.titre_tache);
  if (matches.length === 0) {
    return { reply: `Je ne trouve aucune tâche « ${params.titre_tache} ».` };
  }
  if (matches.length > 1) return ambiguite(params.titre_tache, matches);

  const t = matches[0];
  const { error } = await supabaseAdmin
    .from('taches')
    .update({ statut: params.nouveau_statut })
    .eq('id', t.id)
    .eq('user_id', userId);
  if (error) return { reply: 'Je n’ai pas pu changer le statut. Réessaie ?' };

  return {
    reply: `C’est fait : « ${t.titre} » est maintenant ${STATUT_LABEL[params.nouveau_statut]}.`,
    refresh: true,
  };
}

// ════════════════════════════════════════════════════════════════════
//  4. supprimer_tache — DELETE, avec confirmation explicite au chat.
//     Premier passage : on identifie la tâche et on demande confirmation.
// ════════════════════════════════════════════════════════════════════
async function supprimerTache(
  userId: string,
  params: Extract<Action, { intention: 'supprimer_tache' }>['params'],
): Promise<ChatResponse> {
  const matches = await trouverTaches(userId, params.titre_tache);
  if (matches.length === 0) {
    return { reply: `Je ne trouve aucune tâche « ${params.titre_tache} ».` };
  }
  if (matches.length > 1) return ambiguite(params.titre_tache, matches);

  const t = matches[0];
  return {
    reply: `Confirmer la suppression de « ${t.titre} » ? Cette action est définitive.`,
    pendingConfirm: { type: 'supprimer_tache', tacheId: t.id, titre: t.titre },
  };
}

/** Deuxième passage : la suppression confirmée par l'utilisateur. */
export async function confirmerSuppression(
  userId: string,
  confirm: PendingConfirm,
): Promise<ChatResponse> {
  const { error } = await supabaseAdmin
    .from('taches')
    .delete()
    .eq('id', confirm.tacheId)
    .eq('user_id', userId);
  if (error) return { reply: 'Je n’ai pas pu supprimer la tâche. Réessaie ?' };
  return { reply: `Tâche « ${confirm.titre} » supprimée.`, refresh: true };
}

// ════════════════════════════════════════════════════════════════════
//  5. decouper_tache (générative) — suggère 4 à 6 sous-tâches. Rien en base.
// ════════════════════════════════════════════════════════════════════
async function decouperTache(
  params: Extract<Action, { intention: 'decouper_tache' }>['params'],
): Promise<ChatResponse> {
  let suggestions: string[] = [];
  try {
    const raw = await callOllama(
      [
        {
          role: 'system',
          content:
            'Tu aides à découper une tâche en sous-étapes concrètes. ' +
            'Réponds STRICTEMENT en JSON : { "sous_taches": ["...", "..."] }, ' +
            'entre 4 et 6 sous-tâches courtes et actionnables, en français.',
        },
        { role: 'user', content: `Découpe la tâche : « ${params.titre_tache} »` },
      ],
      { json: true },
    );
    const parsed = JSON.parse(raw) as { sous_taches?: unknown };
    if (Array.isArray(parsed.sous_taches)) {
      suggestions = parsed.sous_taches
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 6);
    }
  } catch {
    suggestions = [];
  }

  if (suggestions.length < 4) {
    return {
      reply: `Je n’ai pas réussi à découper « ${params.titre_tache} » correctement. Réessaie ?`,
    };
  }

  return {
    reply: `Voici une proposition de découpage pour « ${params.titre_tache} » (rien n’est enregistré) :`,
    suggestions,
  };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
export async function executeAction(userId: string, action: Action): Promise<ChatResponse> {
  switch (action.intention) {
    case 'creer_tache':
      return creerTache(userId, action.params);
    case 'lister_taches':
      return listerTaches(userId, action.params);
    case 'changer_statut':
      return changerStatut(userId, action.params);
    case 'supprimer_tache':
      return supprimerTache(userId, action.params);
    case 'decouper_tache':
      return decouperTache(action.params);
  }
}
