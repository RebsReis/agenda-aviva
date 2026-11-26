-- =====================================================================
--  Mural da igreja: avisos gerais e escalas (limpeza, recepção etc.)
--  Todos os membros logados veem; só a administração publica e edita.
-- =====================================================================

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 120),
  body        text check (char_length(body) <= 3000),
  pinned      boolean not null default false,       -- fixado no topo
  expires_on  date,                                 -- some do mural depois desta data
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index announcements_order_idx on public.announcements (pinned desc, created_at desc);

create table public.duties (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (char_length(category) between 2 and 60),   -- ex.: Limpeza
  duty_date   date not null,
  assignees   text not null check (char_length(assignees) between 2 and 300), -- ex.: Família Souza e Ana
  notes       text check (char_length(notes) <= 500),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index duties_date_idx on public.duties (duty_date);

create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();
create trigger duties_touch        before update on public.duties        for each row execute function public.touch_updated_at();

create trigger announcements_audit after insert or update or delete on public.announcements for each row execute function public.audit_changes();
create trigger duties_audit        after insert or update or delete on public.duties        for each row execute function public.audit_changes();

alter table public.announcements enable row level security;
alter table public.duties        enable row level security;

revoke all on public.announcements, public.duties from anon;

create policy "avisos: todos logados veem"  on public.announcements for select to authenticated using (true);
create policy "avisos: só admin cria"       on public.announcements for insert to authenticated with check (public.is_admin());
create policy "avisos: só admin edita"      on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "avisos: só admin apaga"      on public.announcements for delete to authenticated using (public.is_admin());

create policy "escalas: todos logados veem" on public.duties for select to authenticated using (true);
create policy "escalas: só admin cria"      on public.duties for insert to authenticated with check (public.is_admin());
create policy "escalas: só admin edita"     on public.duties for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "escalas: só admin apaga"     on public.duties for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.announcements, public.duties to authenticated;
