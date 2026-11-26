# Agenda Aviva

App web (PWA) da agenda da **Comunidade Cristã Aviva**: cronograma semanal, mensal e anual, eventos por ministério, perguntas e respostas nos eventos, com privacidade e LGPD desde o início.

**Stack:** Next.js 15 · Supabase (Postgres + Auth, região São Paulo) · Tailwind CSS · Vercel

---

## Quem pode o quê

| Papel | Vê a agenda | Pergunta | Cria/edita eventos | Responde perguntas | Ministérios e líderes |
|---|---|---|---|---|---|
| **Membro** | ✅ | ✅ | — | — | — |
| **Líder** | ✅ | ✅ | Só do próprio ministério | Só nos eventos do próprio ministério | — |
| **Secretaria(o)** (uma pessoa) | ✅ | ✅ | — | — | — |
| **Admin geral** (uma pessoa) | ✅ | ✅ | Todos | Todos | ✅ |

**Mural da igreja** (avisos e escalas): publicado pela **admin** e pela **secretaria(o)**. A admin nomeia a secretaria(o) no Painel do admin.

As regras ficam **no próprio banco de dados** (Row Level Security). Mesmo que alguém tente burlar o app, o banco recusa.

## Privacidade (LGPD)

- Coleta só **nome e e-mail**. Senha guardada com hash pelo Supabase Auth; quem entra com Google não tem senha guardada.
- Cada pessoa só vê o próprio perfil. Os membros veem apenas o **nome** de quem pergunta nos eventos, nunca o e-mail.
- Só a admin vê a lista de cadastrados (nome e e-mail).
- Consentimento explícito no cadastro (e também para quem entra pelo Google).
- **Meus dados:** ver, corrigir o nome, baixar tudo (JSON) e **excluir a conta**, que apaga login, perfil e perguntas.
- Histórico de alterações (auditoria) visível só para a admin.
- Dados no Brasil (Supabase `sa-east-1`, São Paulo).

---

## Como colocar no ar

### 1. Criar o projeto no Supabase
1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo.
   - **Region:** `South America (São Paulo)`.
   - Guarde a senha do banco num lugar seguro.
2. Vá em **SQL Editor**, cole todo o conteúdo de `supabase/migrations/0001_inicial.sql` e clique em **Run**.
3. Depois, faça o mesmo com `supabase/migrations/0002_ministerios.sql`. Ele cadastra os ministérios: Jovens, Adolescentes, Mulheres, Homens, Louvor, Infantil, Mídia e **Mural da igreja** (cultos e eventos da igreja toda).

### 2. Configurar o login
Em **Authentication → Sign In / Providers**:
- **Email:** deixe ativado, com **Confirm email** ligado.
- **Google:** ative e preencha o *Client ID* e o *Client Secret*.
  - Crie as credenciais em [console.cloud.google.com](https://console.cloud.google.com) → APIs e serviços → Credenciais → *ID do cliente OAuth* (tipo "Aplicativo da Web").
  - Em *URIs de redirecionamento autorizados*, cole a *Callback URL* que o Supabase mostra (`https://SEU-PROJETO.supabase.co/auth/v1/callback`).

Em **Authentication → URL Configuration**:
- **Site URL:** o endereço do app (ex.: `https://agenda-aviva.vercel.app`).
- **Redirect URLs:** adicione `https://agenda-aviva.vercel.app/**` e `http://localhost:3000/**`.

Em **Authentication → Emails**: traduza os e-mails de confirmação e recuperação de senha para português.

Recomendado: em **Authentication → Attack Protection**, ative a proteção contra senhas vazadas e o CAPTCHA.

### 3. Publicar na Vercel
1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório `agenda-aviva`.
2. Em **Environment Variables**, adicione (os valores estão em Supabase → Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (o endereço final do app)
3. Clique em **Deploy**.

### 4. Virar a administradora
1. Abra o app publicado e crie sua conta.
2. No Supabase → **SQL Editor**, rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'SEU-EMAIL@exemplo.com';
   ```
3. Entre no app → menu → **Painel do admin** → escolha o líder de cada ministério (e adicione outros, se precisar).

### 5. Antes de divulgar
- Em `app/privacidade/page.tsx`, preencha o **CNPJ** e o **e-mail de contato** (procure por `PREENCHER`).
- Ative a verificação em duas etapas na sua conta do Supabase, da Vercel e do GitHub.
- Quando o app estiver em uso, considere o **plano Pro do Supabase** (backups diários e o projeto não pausa por inatividade).

---

## Transferir o cargo de admin
Só pode existir **um** admin (o banco garante isso). Para transferir, rode no SQL Editor:
```sql
begin;
update public.profiles set role = 'membro' where role = 'admin';
update public.profiles set role = 'admin'  where email = 'NOVO-ADMIN@exemplo.com';
commit;
```

## Rodar no computador
```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:3000
```

## Instalar no celular
Abra o site no celular:
- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Instalar app*.
