-- =====================================================================
--  Agenda Aviva — Comunidade Cristã Aviva
--  Esquema inicial do banco (Supabase / Postgres)
--
--  Princípios:
--   * Coleta mínima: só nome e e-mail (senha fica no Supabase Auth, com hash).
--   * RLS em todas as tabelas: cada pessoa só vê os próprios dados pessoais.
--   * Um único administrador geral (garantido por índice único).
--   * Cada ministério tem um líder; o líder só mexe nos eventos do seu ministério.
--   * Exclusão de conta pelo próprio titular (LGPD art. 18).
--   * Log de auditoria das alterações em eventos e ministérios.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PERFIS
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null check (char_length(full_name) between 2 and 120),
  email            text not null,
  role             text not null default 'membro' check (role in ('membro', 'admin')),
  consent_at       timestamptz,          -- quando aceitou a Política de Privacidade
  consent_version  text,                 -- versão da política aceita
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Só pode existir UM administrador geral.
create unique index profiles_um_unico_admin on public.profiles (role) where role = 'admin';

comment on table public.profiles is 'Dados pessoais mínimos (nome e e-mail). Senha fica no Supabase Auth, com hash.';

-- ---------------------------------------------------------------------
-- MINISTÉRIOS
-- ---------------------------------------------------------------------
create table public.ministries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 2 and 80),
  color       text not null default '#E4731D' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  leader_id   uuid references public.profiles (id) on delete set null,
  leader_name text,                      -- só o nome do líder, visível para membros
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  ministry_id  uuid not null references public.ministries (id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 120),
  description  text check (char_length(description) <= 5000),
  location     text check (char_length(location) <= 200),
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint fim_depois_do_inicio check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);
create index events_ministry_idx  on public.events (ministry_id);

-- ---------------------------------------------------------------------
-- PERGUNTAS DOS EVENTOS (públicas, com nome de quem perguntou)
-- ---------------------------------------------------------------------
create table public.questions (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  author_id         uuid not null references public.profiles (id) on delete cascade,
  author_name       text not null,       -- copiado do perfil; o e-mail NUNCA é exposto
  body              text not null check (char_length(body) between 2 and 1000),
  answer            text check (char_length(answer) <= 2000),
  answered_by       uuid references public.profiles (id) on delete set null,
  answered_by_name  text,
  answered_by_role  text check (answered_by_role in ('lider', 'admin')),
  answered_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index questions_event_idx on public.questions (event_id, created_at);

-- ---------------------------------------------------------------------
-- AUDITORIA (só o admin lê; ninguém edita)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,          -- INSERT / UPDATE / DELETE
  entity      text not null,          -- tabela
  entity_id   uuid,
  summary     text,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- =====================================================================
-- FUNÇÕES AUXILIARES (security definer: rodam com permissão do dono,
-- mas só devolvem verdadeiro/falso sobre o próprio usuário logado)
-- =====================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.leads_ministry(p_ministry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministries where id = p_ministry and leader_id = auth.uid());
$$;

create or replace function public.can_manage_event(p_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.events e
    join public.ministries m on m.id = e.ministry_id
    where e.id = p_event and m.leader_id = auth.uid()
  );
$$;

-- Atualiza updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger events_touch    before update on public.events    for each row execute function public.touch_updated_at();
create trigger questions_touch before update on public.questions for each row execute function public.touch_updated_at();

-- =====================================================================
-- CRIAÇÃO AUTOMÁTICA DO PERFIL ao se cadastrar (e-mail ou Google)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name    text;
  v_consent text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );
  v_consent := new.raw_user_meta_data ->> 'consent_version';

  insert into public.profiles (id, full_name, email, consent_at, consent_version)
  values (
    new.id,
    left(v_name, 120),
    new.email,
    case when v_consent is not null then now() end,
    v_consent
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail do perfil igual ao do login
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Se a pessoa mudar o nome, atualiza onde ele aparece publicamente
create or replace function public.propagate_name_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.questions  set author_name      = new.full_name where author_id   = new.id;
    update public.questions  set answered_by_name = new.full_name where answered_by = new.id;
    update public.ministries set leader_name      = new.full_name where leader_id   = new.id;
  end if;
  return new;
end $$;

create trigger profiles_propagate_name
  after update of full_name on public.profiles
  for each row execute function public.propagate_name_change();

-- Ao definir o líder de um ministério, grava só o nome dele (para exibição)
create or replace function public.set_leader_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.leader_id is null then
    new.leader_name := null;
  else
    select full_name into new.leader_name from public.profiles where id = new.leader_id;
  end if;
  return new;
end $$;

create trigger ministries_set_leader_name
  before insert or update of leader_id on public.ministries
  for each row execute function public.set_leader_name();

-- =====================================================================
-- PERGUNTAS: quem pergunta é sempre o usuário logado; resposta só via função
-- =====================================================================
create or replace function public.prepare_question()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    select full_name into new.author_name from public.profiles where id = auth.uid();
    new.answer := null; new.answered_by := null; new.answered_by_name := null;
    new.answered_by_role := null; new.answered_at := null;
  end if;
  return new;
end $$;

create trigger questions_prepare
  before insert on public.questions
  for each row execute function public.prepare_question();

-- Responder (ou editar a resposta): só o líder do ministério do evento ou o admin
create or replace function public.answer_question(p_question uuid, p_answer text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_event uuid;
  v_role  text;
begin
  select event_id into v_event from public.questions where id = p_question;
  if v_event is null then raise exception 'Pergunta não encontrada'; end if;
  if not public.can_manage_event(v_event) then raise exception 'Sem permissão para responder'; end if;
  if p_answer is null or char_length(trim(p_answer)) < 1 then raise exception 'Resposta vazia'; end if;

  v_role := case when public.is_admin() then 'admin' else 'lider' end;

  update public.questions set
    answer           = left(trim(p_answer), 2000),
    answered_by      = auth.uid(),
    answered_by_name = (select full_name from public.profiles where id = auth.uid()),
    answered_by_role = v_role,
    answered_at      = now()
  where id = p_question;
end $$;

-- =====================================================================
-- EXCLUSÃO DA PRÓPRIA CONTA (LGPD art. 18, VI)
-- Apaga login, perfil e perguntas. O admin precisa transferir o cargo antes.
-- =====================================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if public.is_admin() then
    raise exception 'O administrador precisa transferir o cargo antes de excluir a conta';
  end if;
  delete from auth.users where id = auth.uid();   -- cascata apaga perfil e perguntas
end $$;

-- =====================================================================
-- AUDITORIA automática
-- =====================================================================
create or replace function public.audit_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (
    auth.uid(), tg_op, tg_table_name, (v_row ->> 'id')::uuid,
    coalesce(v_row ->> 'title', v_row ->> 'name')
  );
  return null;
end $$;

create trigger events_audit     after insert or update or delete on public.events     for each row execute function public.audit_changes();
create trigger ministries_audit after insert or update or delete on public.ministries for each row execute function public.audit_changes();

-- Perguntas: registra só exclusões (moderação)
create or replace function public.audit_question_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (auth.uid(), 'DELETE', 'questions', old.id, null);
  return null;
end $$;

create trigger questions_audit after delete on public.questions for each row execute function public.audit_question_delete();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.ministries enable row level security;
alter table public.events     enable row level security;
alter table public.questions  enable row level security;
alter table public.audit_log  enable row level security;

-- Visitantes não logados não acessam nada
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;

-- ---------- PROFILES ----------
-- Cada um vê o próprio perfil; o admin vê todos (para nomear líderes).
create policy "perfil: ver o próprio ou admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Cada um edita só o próprio NOME (as colunas role/e-mail ficam bloqueadas abaixo).
create policy "perfil: editar o próprio"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update, delete on public.profiles from authenticated;
grant  select on public.profiles to authenticated;
grant  update (full_name, consent_at, consent_version) on public.profiles to authenticated;

-- ---------- MINISTRIES ----------
create policy "ministérios: todos logados veem"
  on public.ministries for select to authenticated using (true);
create policy "ministérios: só admin cria"
  on public.ministries for insert to authenticated with check (public.is_admin());
create policy "ministérios: só admin edita"
  on public.ministries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ministérios: só admin apaga"
  on public.ministries for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.ministries to authenticated;

-- ---------- EVENTS ----------
create policy "eventos: todos logados veem"
  on public.events for select to authenticated using (true);
create policy "eventos: admin ou líder do ministério cria"
  on public.events for insert to authenticated
  with check (public.is_admin() or public.leads_ministry(ministry_id));
-- USING + WITH CHECK: o líder não consegue mover o evento para outro ministério
create policy "eventos: admin ou líder do ministério edita"
  on public.events for update to authenticated
  using (public.is_admin() or public.leads_ministry(ministry_id))
  with check (public.is_admin() or public.leads_ministry(ministry_id));
create policy "eventos: admin ou líder do ministério apaga"
  on public.events for delete to authenticated
  using (public.is_admin() or public.leads_ministry(ministry_id));

grant select, insert, update, delete on public.events to authenticated;

-- ---------- QUESTIONS ----------
create policy "perguntas: todos logados veem"
  on public.questions for select to authenticated using (true);
create policy "perguntas: membro pergunta em seu nome"
  on public.questions for insert to authenticated with check (auth.uid() is not null);
create policy "perguntas: autor edita enquanto não respondida"
  on public.questions for update to authenticated
  using (author_id = auth.uid() and answer is null)
  with check (author_id = auth.uid());
create policy "perguntas: autor, líder do evento ou admin apaga"
  on public.questions for delete to authenticated
  using (author_id = auth.uid() or public.can_manage_event(event_id));

revoke insert, update on public.questions from authenticated;
grant  select, delete on public.questions to authenticated;
grant  insert (event_id, body) on public.questions to authenticated;
grant  update (body) on public.questions to authenticated;

-- ---------- AUDIT LOG ----------
create policy "auditoria: só admin lê"
  on public.audit_log for select to authenticated using (public.is_admin());
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

-- ---------- FUNÇÕES liberadas para usuários logados ----------
grant execute on function public.is_admin()                     to authenticated;
grant execute on function public.leads_ministry(uuid)           to authenticated;
grant execute on function public.can_manage_event(uuid)         to authenticated;
grant execute on function public.answer_question(uuid, text)    to authenticated;
grant execute on function public.delete_my_account()            to authenticated;
