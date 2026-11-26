-- =====================================================================
--  Mídia: escalas próprias e divulgação de avisos
--   * Escalas podem pertencer a um ministério (ex.: Mídia: Som, Luzes,
--     Fotos e Vídeos, Datashow). Quem gerencia: líderes daquele
--     ministério + admin. Escalas sem ministério continuam com a
--     secretaria + admin.
--   * Ministérios marcados com "publica_avisos" (a Mídia) têm líderes
--     que adicionam e editam avisos gerais. Apagar aviso: só a admin.
-- =====================================================================

-- 1) Ministérios que divulgam avisos -----------------------------------
alter table public.ministries add column publica_avisos boolean not null default false;
update public.ministries set publica_avisos = true where name = 'Mídia';

create or replace function public.can_post_announcements()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.ministry_leaders ml
    join public.ministries m on m.id = ml.ministry_id
    where ml.user_id = auth.uid() and m.publica_avisos
  );
$$;

drop policy "avisos: só admin cria"  on public.announcements;
drop policy "avisos: só admin edita" on public.announcements;
create policy "avisos: admin ou mídia cria"  on public.announcements for insert to authenticated with check (public.can_post_announcements());
create policy "avisos: admin ou mídia edita" on public.announcements for update to authenticated using (public.can_post_announcements()) with check (public.can_post_announcements());
-- "avisos: só admin apaga" continua valendo

-- 2) Escalas de ministério ----------------------------------------------
alter table public.duties add column ministry_id uuid references public.ministries (id) on delete cascade;
create index duties_ministry_idx on public.duties (ministry_id, duty_date);

create or replace function public.can_manage_duty(p_ministry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_ministry is null then public.can_manage_mural()          -- escalas da igreja: secretaria + admin
    else public.is_admin() or public.leads_ministry(p_ministry)      -- escalas do ministério: seus líderes + admin
  end;
$$;

drop policy "escalas: admin ou secretaria cria"  on public.duties;
drop policy "escalas: admin ou secretaria edita" on public.duties;
drop policy "escalas: admin ou secretaria apaga" on public.duties;
create policy "escalas: responsável cria"  on public.duties for insert to authenticated with check (public.can_manage_duty(ministry_id));
create policy "escalas: responsável edita" on public.duties for update to authenticated using (public.can_manage_duty(ministry_id)) with check (public.can_manage_duty(ministry_id));
create policy "escalas: responsável apaga" on public.duties for delete to authenticated using (public.can_manage_duty(ministry_id));

revoke execute on function public.can_post_announcements(), public.can_manage_duty(uuid) from public, anon;
grant  execute on function public.can_post_announcements(), public.can_manage_duty(uuid) to authenticated;
