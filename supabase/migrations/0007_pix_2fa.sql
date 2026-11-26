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
