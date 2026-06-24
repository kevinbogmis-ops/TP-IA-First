-- ════════════════════════════════════════════════════════════════════
--  Assistant de tâches d'équipe — schéma Supabase
--  À coller dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : peut être rejoué sans erreur.
-- ════════════════════════════════════════════════════════════════════

-- ── Type énuméré du statut d'une tâche ──────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'statut_tache') then
    create type statut_tache as enum ('a_faire', 'en_cours', 'termine');
  end if;
end $$;

-- ── Table : projets ─────────────────────────────────────────────────
create table if not exists public.projets (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null,
  user_id  uuid not null references auth.users (id) on delete cascade,
  cree_le  timestamptz not null default now()
);

-- ── Table : taches ──────────────────────────────────────────────────
create table if not exists public.taches (
  id         uuid primary key default gen_random_uuid(),
  projet_id  uuid not null references public.projets (id) on delete cascade,
  titre      text not null,
  statut     statut_tache not null default 'a_faire',
  echeance   date,                     -- nullable : sert au filtre « en retard »
  user_id    uuid not null references auth.users (id) on delete cascade,
  cree_le    timestamptz not null default now()
);

-- Index utiles aux recherches par utilisateur / par projet / par titre
create index if not exists idx_projets_user   on public.projets (user_id);
create index if not exists idx_taches_user    on public.taches (user_id);
create index if not exists idx_taches_projet  on public.taches (projet_id);

-- ════════════════════════════════════════════════════════════════════
--  Row Level Security : chacun ne voit et ne touche que ses lignes.
-- ════════════════════════════════════════════════════════════════════
alter table public.projets enable row level security;
alter table public.taches  enable row level security;

-- Projets : chacun ne voit et ne touche que les siens
drop policy if exists "projets_user_only" on public.projets;
create policy "projets_user_only" on public.projets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tâches : même règle, et on vérifie aussi que le projet parent appartient
-- bien à l'utilisateur courant.
drop policy if exists "taches_user_only" on public.taches;
create policy "taches_user_only" on public.taches
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projets
      where projets.id = taches.projet_id
        and projets.user_id = auth.uid()
    )
  );
