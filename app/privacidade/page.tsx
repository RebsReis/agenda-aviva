import Link from "next/link";
import Image from "next/image";

// ⚠️ Antes de publicar: preencha CNPJ e e-mail de contato (procure por "PREENCHER").
const CONTATO_EMAIL = "PREENCHER@email.com";
const CNPJ = "PREENCHER";
const ATUALIZADA_EM = "26 de novembro de 2026";

export const metadata = { title: "Política de Privacidade · Agenda Aviva" };

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh">
      <div className="meio-tom bg-aviva px-6 py-8 text-white">
        <div className="mx-auto max-w-2xl">
          <Link href="/"><Image src="/logo-aviva-branco.png" alt="Comunidade Cristã Aviva" width={200} height={34} /></Link>
          <h1 className="titulo mt-6 text-4xl">Política de Privacidade</h1>
          <p className="mt-1 text-sm opacity-90">Atualizada em {ATUALIZADA_EM}</p>
        </div>
      </div>

      <article className="mx-auto max-w-2xl space-y-6 px-6 py-8 leading-relaxed [&_h2]:titulo [&_h2]:text-2xl [&_h2]:text-aviva [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <h2>1. Quem cuida dos seus dados</h2>
          <p>
            A <b>Comunidade Cristã Aviva</b> (CNPJ {CNPJ}), Rua João Crispiniano Soares, 420 — Pq. Boa Esperança, é a controladora
            dos dados tratados na Agenda Aviva, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
          </p>
          <p className="mt-2">
            Encarregada pelo tratamento de dados (DPO): <b>Rebeca Reis</b> — {CONTATO_EMAIL}.
          </p>
        </section>

        <section>
          <h2>2. Quais dados coletamos</h2>
          <ul>
            <li><b>Nome</b> e <b>e-mail</b>, informados no cadastro ou recebidos da sua conta Google (com sua autorização).</li>
            <li><b>Senha</b>, guardada apenas em forma criptografada (hash). Ninguém, nem a administração, consegue vê-la. Quem entra com Google não tem senha guardada.</li>
            <li><b>Perguntas</b> que você escrever nos eventos.</li>
            <li>Registros técnicos de acesso (data e hora de login), para segurança.</li>
          </ul>
          <p className="mt-2">Não coletamos telefone, CPF, endereço, ano de nascimento, fotos ou localização.</p>
          <p className="mt-2">
            <b>Aniversariantes:</b> a secretaria da igreja pode publicar no mural o nome e o <b>dia e mês</b> do aniversário (nunca o ano) de quem autorizar.
            Para retirar seu nome, peça à secretaria ou escreva para o e-mail de contato abaixo.
          </p>
        </section>

        <section>
          <h2>3. Para que usamos</h2>
          <ul>
            <li>Permitir seu acesso à agenda da igreja.</li>
            <li>Identificar quem faz e quem responde perguntas nos eventos.</li>
            <li>Enviar e-mails do próprio sistema (confirmação de conta e recuperação de senha).</li>
          </ul>
          <p className="mt-2">Não usamos seus dados para propaganda e não os vendemos nem compartilhamos com terceiros para outros fins.</p>
        </section>

        <section>
          <h2>4. Base legal e dado sensível</h2>
          <p>
            Como o uso da agenda pode indicar vínculo com uma organização religiosa — informação considerada <b>dado pessoal sensível</b> pela LGPD (art. 5º, II) —,
            o tratamento se baseia no seu <b>consentimento específico e destacado</b> (art. 11, I), dado no cadastro. Você pode revogá-lo a qualquer momento excluindo sua conta.
          </p>
        </section>

        <section>
          <h2>5. Quem pode ver seus dados</h2>
          <ul>
            <li><b>Outros membros</b>: veem apenas o seu nome, e somente nas perguntas que você fizer nos eventos. Nunca veem seu e-mail.</li>
            <li><b>Líderes de ministério</b>: veem o mesmo que os membros.</li>
            <li><b>Administradora geral</b>: vê nome e e-mail dos cadastrados, apenas para administrar a agenda e nomear líderes.</li>
          </ul>
        </section>

        <section>
          <h2>6. Onde ficam e como protegemos</h2>
          <p>
            Os dados ficam no Supabase, em servidores localizados em São Paulo (Brasil), com conexão criptografada (HTTPS), regras de acesso no próprio banco de dados
            (cada pessoa só acessa o que pode), registro de alterações e backups. O site é hospedado pela Vercel.
          </p>
        </section>

        <section>
          <h2>7. Por quanto tempo guardamos</h2>
          <p>Enquanto sua conta existir. Ao excluir a conta, apagamos nome, e-mail, login e suas perguntas de forma definitiva. Cópias de backup são eliminadas automaticamente em até 7 dias.</p>
        </section>

        <section>
          <h2>8. Seus direitos</h2>
          <p>Pela LGPD (art. 18) você pode, a qualquer momento:</p>
          <ul>
            <li>Ver e baixar seus dados — em <Link href="/meus-dados" className="font-bold text-aviva underline">Meus dados</Link>.</li>
            <li>Corrigir seu nome — em Meus dados.</li>
            <li>Excluir sua conta e revogar o consentimento — em Meus dados.</li>
            <li>Tirar dúvidas ou fazer outros pedidos — pelo e-mail {CONTATO_EMAIL}.</li>
          </ul>
          <p className="mt-2">Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
        </section>

        <section>
          <h2>9. Idade mínima</h2>
          <p>A Agenda Aviva é destinada a maiores de 18 anos.</p>
        </section>

        <section>
          <h2>10. Mudanças nesta política</h2>
          <p>Se esta política mudar de forma relevante, avisaremos no app e pediremos um novo aceite, quando necessário.</p>
        </section>
      </article>
    </main>
  );
}
