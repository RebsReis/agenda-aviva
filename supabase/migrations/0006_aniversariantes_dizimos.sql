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
