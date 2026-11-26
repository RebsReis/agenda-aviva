-- Líderes da Mídia (ministérios com "publica_avisos") também apagam avisos.
drop policy "avisos: só admin apaga" on public.announcements;
create policy "avisos: admin ou mídia apaga"
  on public.announcements for delete to authenticated
  using (public.can_post_announcements());
