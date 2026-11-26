-- =====================================================================
--  Secretaria(o) da igreja
--  Uma única pessoa, nomeada pela admin, que cuida do Mural
--  (avisos gerais e escalas). Não mexe em eventos de ministérios
--  nem vê dados pessoais de outros membros.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('membro', 'admin', 'secretaria'));

-- Só pode existir UMA secretaria(o)
create unique index profiles_uma_unica_secretaria on public.profiles (role) where role = 'secretaria';

create or replace function public.is_secretary()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'secretaria');
$$;

create or replace function public.can_manage_mural()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_secretary();
$$;

-- A admin nomeia (ou remove, com null) a secretaria(o). A anterior volta a ser membro.
create or replace function public.set_secretary(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só a administração pode nomear a secretaria'; end if;
  if p_user is not null and exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'A admin já tem acesso ao Mural';
  end if;
  update public.profiles set role = 'membro' where role = 'secretaria';
  if p_user is not null then
    update public.profiles set role = 'secretaria' where id = p_user;
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (auth.uid(), 'UPDATE', 'secretaria', p_user,
          (select full_name from public.profiles where id = p_user));
end $$;

revoke execute on function public.is_secretary(), public.can_manage_mural(), public.set_secretary(uuid) from public, anon;
grant  execute on function public.is_secretary(), public.can_manage_mural(), public.set_secretary(uuid) to authenticated;

-- Mural: admin OU secretaria publicam
drop policy "avisos: só admin cria"  on public.announcements;
drop policy "avisos: só admin edita" on public.announcements;
drop policy "avisos: só admin apaga" on public.announcements;
create policy "avisos: admin ou secretaria cria"  on public.announcements for insert to authenticated with check (public.can_manage_mural());
create policy "avisos: admin ou secretaria edita" on public.announcements for update to authenticated using (public.can_manage_mural()) with check (public.can_manage_mural());
create policy "avisos: admin ou secretaria apaga" on public.announcements for delete to authenticated using (public.can_manage_mural());

drop policy "escalas: só admin cria"  on public.duties;
drop policy "escalas: só admin edita" on public.duties;
drop policy "escalas: só admin apaga" on public.duties;
create policy "escalas: admin ou secretaria cria"  on public.duties for insert to authenticated with check (public.can_manage_mural());
create policy "escalas: admin ou secretaria edita" on public.duties for update to authenticated using (public.can_manage_mural()) with check (public.can_manage_mural());
create policy "escalas: admin ou secretaria apaga" on public.duties for delete to authenticated using (public.can_manage_mural());
