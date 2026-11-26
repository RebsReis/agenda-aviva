-- =====================================================================
--  Equipe de ministério (ex.: equipe da Mídia)
--   * Líderes do ministério (e a admin) adicionam pessoas pela conta
--     (e-mail de cadastro), sem precisar ver a lista de todos os membros.
--   * Quem é da equipe de um ministério que "publica_avisos" (Mídia)
--     adiciona, edita e apaga avisos gerais.
-- =====================================================================

create table public.ministry_members (
  ministry_id  uuid not null references public.ministries (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  member_name  text,
  added_by     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (ministry_id, user_id)
);

create index ministry_members_user_idx on public.ministry_members (user_id);

alter table public.ministry_members enable row level security;
revoke all on public.ministry_members from anon;

-- A equipe é vista pela própria pessoa, pelos líderes do ministério e pela admin
create policy "equipe: ver"
  on public.ministry_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.leads_ministry(ministry_id));
create policy "equipe: líder ou admin remove"
  on public.ministry_members for delete to authenticated
  using (public.is_admin() or public.leads_ministry(ministry_id));

revoke insert, update on public.ministry_members from authenticated;
grant select, delete on public.ministry_members to authenticated;

-- Adicionar pelo e-mail (sem expor a lista de cadastrados). Devolve o nome ou erro.
create or replace function public.add_ministry_member(p_ministry uuid, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_name text;
begin
  if not (public.is_admin() or public.leads_ministry(p_ministry)) then
    raise exception 'Sem permissão para montar esta equipe';
  end if;
  select id, full_name into v_user, v_name from public.profiles where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Nenhuma conta com este e-mail. A pessoa precisa se cadastrar no app primeiro.';
  end if;
  insert into public.ministry_members (ministry_id, user_id, member_name, added_by)
  values (p_ministry, v_user, v_name, auth.uid())
  on conflict do nothing;
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (auth.uid(), 'INSERT', 'ministry_members', p_ministry, v_name);
  return v_name;
end $$;

revoke execute on function public.add_ministry_member(uuid, text) from public, anon;
grant  execute on function public.add_ministry_member(uuid, text) to authenticated;

create trigger ministry_members_audit_delete
  after delete on public.ministry_members
  for each row execute function public.audit_changes();

-- Nome atualizado se a pessoa mudar o próprio nome
create or replace function public.propagate_member_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.ministry_members set member_name = new.full_name where user_id = new.id;
  end if;
  return new;
end $$;

create trigger profiles_propagate_member_name
  after update of full_name on public.profiles
  for each row execute function public.propagate_member_name();

-- Avisos: admin + líderes + EQUIPE dos ministérios que divulgam (Mídia)
create or replace function public.can_post_announcements()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or exists (
      select 1 from public.ministry_leaders ml
      join public.ministries m on m.id = ml.ministry_id
      where ml.user_id = auth.uid() and m.publica_avisos
    )
    or exists (
      select 1 from public.ministry_members mm
      join public.ministries m on m.id = mm.ministry_id
      where mm.user_id = auth.uid() and m.publica_avisos
    );
$$;
