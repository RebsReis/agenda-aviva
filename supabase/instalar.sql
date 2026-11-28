-- =====================================================================
--  AGENDA AVIVA — instalação completa do banco (cole tudo e clique em RUN)
--  Supabase > SQL Editor > New query
--  Rode UMA vez só, num projeto novo.
-- =====================================================================

-- ===================== 0001_inicial.sql =====================
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

-- ===================== 0002_ministerios.sql =====================
-- Ministérios da Comunidade Cristã Aviva
-- Os líderes são escolhidos depois, pelo Painel do admin.
insert into public.ministries (name, color) values
  ('Jovens',       '#B91C1C'),
  ('Adolescentes', '#F59E0B'),
  ('Mulheres',     '#BE185D'),
  ('Homens',       '#334155'),
  ('Louvor',       '#E4731D'),
  ('Infantil',     '#CA8A04'),
  ('Mídia',        '#0F766E'),
  -- Cultos e eventos da igreja toda. No app, este filtro também mostra o Mural (avisos e escalas)
  ('Mural da igreja', '#231A14')
on conflict (name) do nothing;

-- ===================== 0003_mural.sql =====================
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

-- ===================== 0004_secretaria.sql =====================
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

-- ===================== 0005_avisos_so_admin.sql =====================
-- =====================================================================
--  Divisão do Mural:
--   * Avisos  -> só a admin publica, edita e apaga
--   * Escalas -> secretaria(o) e admin adicionam, alteram e apagam
-- =====================================================================

drop policy "avisos: admin ou secretaria cria"  on public.announcements;
drop policy "avisos: admin ou secretaria edita" on public.announcements;
drop policy "avisos: admin ou secretaria apaga" on public.announcements;

create policy "avisos: só admin cria"  on public.announcements for insert to authenticated with check (public.is_admin());
create policy "avisos: só admin edita" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "avisos: só admin apaga" on public.announcements for delete to authenticated using (public.is_admin());

-- As regras das escalas (admin ou secretaria) continuam as da migração 0004.

-- ===================== 0006_aniversariantes_dizimos.sql =====================
-- =====================================================================
--  Mural: aniversariantes do mês e dízimos/ofertas (Pix)
--   * Aniversariantes -> secretaria(o) e admin cadastram. Só dia e mês
--     (sem ano), para não expor a idade.
--   * Dízimos e ofertas -> SÓ a admin altera a chave Pix (evita fraude
--     caso outra conta seja invadida). Toda alteração fica na auditoria.
-- =====================================================================

create table public.birthdays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  day         smallint not null check (day between 1 and 31),
  month       smallint not null check (month between 1 and 12),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint data_valida check (not (month = 2 and day > 29) and not (month in (4, 6, 9, 11) and day > 30))
);

create index birthdays_month_day_idx on public.birthdays (month, day);

create table public.giving_info (
  id           uuid primary key default gen_random_uuid(),
  singleton    boolean not null default true unique check (singleton),  -- só existe uma linha
  pix_key      text check (char_length(pix_key) <= 120),
  pix_key_type text check (pix_key_type in ('CNPJ', 'E-mail', 'Telefone', 'Aleatória')),
  beneficiary  text check (char_length(beneficiary) <= 120),             -- nome que aparece no Pix
  bank         text check (char_length(bank) <= 80),
  email        text check (char_length(email) <= 120),                   -- e-mail da igreja
  message      text check (char_length(message) <= 500),
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

insert into public.giving_info (message)
values ('Sua contribuição sustenta a obra de Deus em nossa comunidade. Obrigado pela generosidade!');

create trigger birthdays_touch   before update on public.birthdays   for each row execute function public.touch_updated_at();
create trigger giving_info_touch before update on public.giving_info for each row execute function public.touch_updated_at();

create trigger birthdays_audit   after insert or update or delete on public.birthdays   for each row execute function public.audit_changes();
create trigger giving_info_audit after insert or update or delete on public.giving_info for each row execute function public.audit_changes();

alter table public.birthdays   enable row level security;
alter table public.giving_info enable row level security;
revoke all on public.birthdays, public.giving_info from anon;

-- Aniversariantes: todos logados veem; admin ou secretaria gerenciam
create policy "aniversariantes: todos logados veem"       on public.birthdays for select to authenticated using (true);
create policy "aniversariantes: admin ou secretaria cria"  on public.birthdays for insert to authenticated with check (public.can_manage_mural());
create policy "aniversariantes: admin ou secretaria edita" on public.birthdays for update to authenticated using (public.can_manage_mural()) with check (public.can_manage_mural());
create policy "aniversariantes: admin ou secretaria apaga" on public.birthdays for delete to authenticated using (public.can_manage_mural());
grant select, insert, update, delete on public.birthdays to authenticated;

-- Dízimos e ofertas: todos logados veem; só a admin altera (não cria nem apaga: é uma linha só)
create policy "dízimos: todos logados veem" on public.giving_info for select to authenticated using (true);
create policy "dízimos: só admin altera"    on public.giving_info for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.giving_info from authenticated;
grant select, update on public.giving_info to authenticated;

-- ===================== 0007_pix_2fa.sql =====================
-- =====================================================================
--  Dados do Pix só podem ser alterados pela admin COM verificação em
--  duas etapas (sessão com nível "aal2" no Supabase Auth).
--  Mesmo que alguém descubra a senha da admin, não troca a chave Pix
--  sem o código do aplicativo autenticador.
-- =====================================================================

drop policy "dízimos: só admin altera" on public.giving_info;

create policy "dízimos: só admin com 2 etapas altera"
  on public.giving_info for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

-- ===================== 0008_varias_lideres.sql =====================
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

-- ===================== 0009_midia.sql =====================
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

-- ===================== 0010_midia_apaga_avisos.sql =====================
-- Líderes da Mídia (ministérios com "publica_avisos") também apagam avisos.
drop policy "avisos: só admin apaga" on public.announcements;
create policy "avisos: admin ou mídia apaga"
  on public.announcements for delete to authenticated
  using (public.can_post_announcements());

-- ===================== 0011_equipe_ministerio.sql =====================
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

-- ===================== Contas criadas antes desta instalação =====================
-- Cria o perfil de quem já tinha se cadastrado antes de rodar este arquivo
-- (essa pessoa verá a tela de aceite da Política de Privacidade ao entrar).
insert into public.profiles (id, full_name, email)
select u.id,
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                     nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
                     split_part(u.email, '@', 1)), 120),
       u.email
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
