import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Ministry, Profile } from "@/lib/types";

export type Session = {
  profile: Profile;
  isAdmin: boolean;
  /** Ministérios que esta pessoa lidera */
  ledMinistries: Ministry[];
  canEdit: boolean;
  isSecretary: boolean;
  /** Avisos do mural: só a admin */
  canManageAvisos: boolean;
  /** Escalas do mural: admin ou secretaria */
  canManageEscalas: boolean;
  /** Entrou com verificação em duas etapas nesta sessão */
  twoFactor: boolean;
  /** Tem autenticador ativado */
  hasTwoFactor: boolean;
};

/**
 * Exige login e consentimento. Redireciona se faltar algum dos dois.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");
  if (!profile.consent_at) redirect("/consentimento");

  // Quem ativou as duas etapas precisa digitar o código ao entrar
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/verificar-2fa");

  const { data: led } = await supabase
    .from("ministries")
    .select("*")
    .eq("leader_id", user.id)
    .order("name");

  const isAdmin = profile.role === "admin";
  const ledMinistries = (led ?? []) as Ministry[];
  const isSecretary = profile.role === "secretaria";
  return {
    profile,
    isAdmin,
    ledMinistries,
    canEdit: isAdmin || ledMinistries.length > 0,
    isSecretary,
    canManageAvisos: isAdmin,
    canManageEscalas: isAdmin || isSecretary,
    twoFactor: aal?.currentLevel === "aal2",
    hasTwoFactor: aal?.nextLevel === "aal2",
  };
}
