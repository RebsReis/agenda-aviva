-- =====================================================================
--  Vários líderes por ministério (ex.: Ministério de Mulheres)
--
--  Regra de edição de eventos:
--   * Admin: todos.
--   * Ministério com UM líder: o líder edita todos os eventos do ministério.
--   * Ministério com VÁRIOS líderes: cada líder edita só os eventos que criou.
--  Cada evento guarda o nome do líder responsável (quem criou).
-- =====================================================================

-- 1) Tabela de líderes ------------------------------------------------
create table public.ministry_leaders (
  ministry_id  uuid not null references public.ministries (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  leader_name  text,
  created_at   timestamptz not null default now(),
  primary key (ministry_id, user_id)
);

create index ministry_leaders_user_idx on public.ministry_leaders (user_id);

-- Leva os líderes atuais para a nova tabela
insert into public.ministry_leaders (ministry_id, user_id, leader_name)
select id, leader_id, leader_name from public.ministries where leader_id is not null;

-- Remove o modelo antigo (um líder por ministério)
drop trigger if exists ministries_set_leader_name on public.ministries;
drop function if exists public.set_leader_name();
alter table public.ministries drop column leader_id, drop column leader_name;

-- Nome do líder gravado automaticamente (para exibição)
create or replace function public.set_ministry_leader_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select full_name into new.leader_name from public.profiles where id = new.user_id;
  return new;
end $$;

create trigger ministry_leaders_set_name
  before insert on public.ministry_leaders
  for each row execute function public.set_ministry_leader_name();

-- 2) Responsável de cada evento ---------------------------------------
alter table public.events add column responsible_name text;

update public.events e set responsible_name = p.full_name
from public.profiles p where p.id = e.created_by;

-- Quem cria é sempre o usuário logado; o criador não muda depois
create or replace function public.set_event_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.created_by := auth.uid(); end if;
    select full_name into new.responsible_name from public.profiles where id = new.created_by;
  else
    new.created_by := old.created_by;
    -- só a troca de nome do próprio perfil (abaixo) pode atualizar o nome do responsável
    if coalesce(current_setting('app.atualizando_nome', true), '') <> 'sim' then
      new.responsible_name := old.responsible_name;
    end if;
  end if;
  return new;
end $$;

create trigger events_set_owner
  before insert or update on public.events
  for each row execute function public.set_event_owner();

-- 3) Funções de permissão ---------------------------------------------
create or replace function public.leads_ministry(p_ministry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_leaders where ministry_id = p_ministry and user_id = auth.uid());
$$;

create or replace function public.can_manage_event(p_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1
    from public.events e
    join public.ministry_leaders ml on ml.ministry_id = e.ministry_id and ml.user_id = auth.uid()
    where e.id = p_event
      and (
        e.created_by = auth.uid()
        or (select count(*) from public.ministry_leaders x where x.ministry_id = e.ministry_id) = 1
      )
  );
$$;

-- 4) Regras dos eventos -----------------------------------------------
drop policy "eventos: admin ou líder do ministério edita" on public.events;
drop policy "eventos: admin ou líder do ministério apaga" on public.events;

create policy "eventos: admin ou líder responsável edita"
  on public.events for update to authenticated
  using (public.can_manage_event(id))
  with check (public.is_admin() or public.leads_ministry(ministry_id));

create policy "eventos: admin ou líder responsável apaga"
  on public.events for delete to authenticated
  using (public.can_manage_event(id));

-- 5) Regras da tabela de líderes ---------------------------------------
alter table public.ministry_leaders enable row level security;
revoke all on public.ministry_leaders from anon;

create policy "líderes: todos logados veem" on public.ministry_leaders for select to authenticated using (true);
create policy "líderes: só admin nomeia"    on public.ministry_leaders for insert to authenticated with check (public.is_admin());
create policy "líderes: só admin remove"    on public.ministry_leaders for delete to authenticated using (public.is_admin());

revoke update on public.ministry_leaders from authenticated;
grant select, insert, delete on public.ministry_leaders to authenticated;

-- 6) Nome atualizado em todo lugar + auditoria --------------------------
create or replace function public.propagate_name_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.questions        set author_name      = new.full_name where author_id   = new.id;
    update public.questions        set answered_by_name = new.full_name where answered_by = new.id;
    update public.ministry_leaders set leader_name      = new.full_name where user_id     = new.id;
    perform set_config('app.atualizando_nome', 'sim', true);
    update public.events           set responsible_name = new.full_name where created_by  = new.id;
    perform set_config('app.atualizando_nome', '', true);
  end if;
  return new;
end $$;

create or replace function public.audit_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'ministry_id')::uuid,
    coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'leader_name')
  );
  return null;
end $$;

create trigger ministry_leaders_audit
  after insert or delete on public.ministry_leaders
  for each row execute function public.audit_changes();
