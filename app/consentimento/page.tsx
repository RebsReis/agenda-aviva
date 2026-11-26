import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/types";
import { signOut } from "@/app/auth/actions";

// Quem entra pelo Google não passa pelo formulário de cadastro,
// então confirma aqui o nome e o aceite da Política de Privacidade.
async function accept(formData: FormData) {
  "use server";
  if (!formData.get("consent")) redirect("/consentimento?erro=1");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase
    .from("profiles")
    .update({ full_name: name.length >= 2 ? name : undefined, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION })
    .eq("id", user.id);
  redirect("/");
}

export default async function ConsentimentoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, consent_at").eq("id", user.id).single();
  if (profile?.consent_at) redirect("/");

  return (
    <AuthShell title="Bem-vindo(a)!">
      <form action={accept} className="space-y-4">
        <p className="text-sm text-tinta/70">Antes de continuar, confirme como seu nome deve aparecer:</p>
        <input className="campo" name="name" defaultValue={profile?.full_name ?? ""} minLength={2} maxLength={120} required />
        <label className="flex items-start gap-3 rounded-xl bg-creme p-3 text-sm">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5 accent-aviva" />
          <span>
            Li e aceito a <Link href="/privacidade" target="_blank" className="font-bold text-aviva underline">Política de Privacidade</Link>.
            Entendo que meu nome aparecerá para os membros quando eu fizer perguntas nos eventos, e que posso excluir minha conta a qualquer momento.
            Declaro ter 18 anos ou mais.
          </span>
        </label>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">É preciso aceitar a Política de Privacidade para usar o app.</p>}
        <button className="botao w-full">Continuar</button>
      </form>
      <form action={signOut}>
        <button className="mt-4 w-full text-center text-sm text-tinta/60 underline">Não aceito — sair</button>
      </form>
    </AuthShell>
  );
}
