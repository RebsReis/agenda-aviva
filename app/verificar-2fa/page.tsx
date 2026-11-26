import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import TwoFactorVerify from "@/components/TwoFactorVerify";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Verificar2faPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === data?.nextLevel) redirect("/");

  return (
    <AuthShell title="Código">
      <TwoFactorVerify next="/" />
      <form action={signOut}>
        <button className="mt-4 w-full text-center text-sm text-tinta/60 underline">Sair</button>
      </form>
    </AuthShell>
  );
}
