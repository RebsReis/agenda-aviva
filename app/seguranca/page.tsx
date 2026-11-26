import Header from "@/components/Header";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { requireSession } from "@/lib/auth";

export default async function SegurancaPage() {
  const session = await requireSession();
  return (
    <>
      <Header session={session} />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <div>
          <p className="font-script text-2xl text-tinta/60">proteja sua conta,</p>
          <h1 className="titulo text-5xl text-aviva">Segurança</h1>
        </div>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Verificação em duas etapas</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Além da senha, o app pede um código que muda a cada 30 segundos no seu celular. Mesmo que alguém descubra sua senha, não entra sem o código.
          </p>
          {session.isAdmin && (
            <p className="mt-3 rounded-xl bg-creme px-4 py-3 text-sm font-semibold">
              Obrigatória para a administradora alterar os dados do Pix.
            </p>
          )}
          <div className="mt-4"><TwoFactorSetup /></div>
        </section>
      </main>
    </>
  );
}
