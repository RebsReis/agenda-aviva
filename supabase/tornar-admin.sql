-- Torna uma conta a ADMINISTRADORA GERAL (só pode existir uma).
-- 1) Crie a conta no app (e confirme o e-mail).  2) Troque o e-mail abaixo.  3) RUN.
update public.profiles set role = 'admin' where lower(email) = lower('SEU-EMAIL@exemplo.com');

-- Confira: deve aparecer uma linha com role = admin
select full_name, email, role from public.profiles where role = 'admin';
