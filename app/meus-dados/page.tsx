import Header from "@/components/Header";
import { requireSession } from "@/lib/auth";
import { deleteAccount, updateName } from "./actions";

export default async function MeusDadosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const session = await requireSession();
  const { ok, erro } = await searchParams;
  const p = session.profile;

  return (
    <>
      <Header session={session} />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <div>
          <p className="font-script text-2xl text-tinta/60">sua conta,</p>
          <h1 className="titulo text-5xl text-aviva">Meus dados</h1>
        </div>
        {ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Dados atualizados.</p>}
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">O que guardamos sobre você</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-tinta/50">Nome</dt><dd className="font-semibold">{p.full_name}</dd></div>
            <div><dt className="text-tinta/50">E-mail</dt><dd className="font-semibold">{p.email}</dd></div>
            <div><dt className="text-tinta/50">Conta criada em</dt><dd className="font-semibold">{new Date(p.created_at).toLocaleDateString("pt-BR")}</dd></div>
            <div><dt className="text-tinta/50">Política de Privacidade aceita em</dt><dd className="font-semibold">{p.consent_at ? new Date(p.consent_at).toLocaleDateString("pt-BR") : "—"}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-tinta/50">Sua senha é guardada criptografada (hash) e ninguém consegue vê-la. Também guardamos as perguntas que você fizer nos eventos.</p>
        </section>

        <form action={updateName} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Corrigir meu nome</h2>
          <div className="mt-3 flex gap-2">
            <input name="name" defaultValue={p.full_name} className="campo py-2" minLength={2} maxLength={120} required />
            <button className="botao py-2">Salvar</button>
          </div>
        </form>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Baixar meus dados</h2>
          <p className="mt-1 text-sm text-tinta/60">Um arquivo com tudo o que está guardado sobre você.</p>
          <a href="/meus-dados/exportar" className="botao-sec mt-3 w-full">Baixar (JSON)</a>
        </section>

        <form action={deleteAccount} className="rounded-2xl border-2 border-red-200 bg-white p-5">
          <h2 className="font-bold text-red-700">Excluir minha conta</h2>
          <p className="mt-1 text-sm text-tinta/60">Apaga definitivamente seu login, seus dados e suas perguntas. Não dá para desfazer.</p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" required className="h-5 w-5 accent-red-600" /> Entendo e quero excluir
          </label>
          <button className="mt-3 w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700">Excluir conta</button>
        </form>
      </main>
    </>
  );
}
