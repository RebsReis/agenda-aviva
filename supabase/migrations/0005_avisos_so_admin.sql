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
