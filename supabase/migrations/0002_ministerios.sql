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
