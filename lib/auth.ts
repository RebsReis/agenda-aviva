import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Ministry, Profile } from "@/lib/types";

export type Session = {
  profile: Profile;
  isAdmin: boolean;
  /** Ministérios que esta pessoa lidera */
  ledMinistries: Ministry[];
  /** Ministérios em cuja equipe a pessoa está (ex.: equipe da Mídia) */
  teamMinistries: Ministry[];
  canEdit: boolean;
  isSecretary: boolean;
  /** Adicionar e editar avisos: admin, líderes e equipe dos ministérios que divulgam (Mídia) */
  canManageAvisos: boolean;
  /** Apagar avisos: admin, líderes e equipe da Mídia */
  canDeleteAvisos: boolean;
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
    .from("ministry_leaders")
    .select("ministries(*, ministry_leaders(user_id, leader_name))")
    .eq("user_id", user.id);

  const { data: teams } = await supabase.from("ministry_members").select("ministries(*)").eq("user_id", user.id);
  const teamMinistries = ((teams ?? []) as unknown as { ministries: Ministry | null }[])
    .map((t) => t.ministries)
    .filter((m): m is Ministry => !!m);

  const isAdmin = profile.role === "admin";
  const ledMinistries = ((led ?? []) as unknown as { ministries: Ministry | null }[])
    .map((l) => l.ministries)
    .filter((m): m is Ministry => !!m)
    .sort((a, b) => a.name.localeCompare(b.name));
  const isSecretary = profile.role === "secretaria";
  return {
    profile,
    isAdmin,
    ledMinistries,
    teamMinistries,
    canEdit: isAdmin || ledMinistries.length > 0,
    isSecretary,
    canManageAvisos: isAdmin || [...ledMinistries, ...teamMinistries].some((m) => m.publica_avisos),
    canDeleteAvisos: isAdmin || [...ledMinistries, ...teamMinistries].some((m) => m.publica_avisos),
    canManageEscalas: isAdmin || isSecretary,
    twoFactor: aal?.currentLevel === "aal2",
    hasTwoFactor: aal?.nextLevel === "aal2",
  };
}

/**
 * Pode editar o evento?
 * Admin: sempre. Líder: se o ministério tem um líder só, ou se foi ele quem criou o evento.
 * (O banco aplica a mesma regra; isto só decide o que mostrar na tela.)
 */
export function canManageEvent(
  session: Session,
  event: { ministry_id: string; created_by: string | null },
  leaderCount: number,
) {
  if (session.isAdmin) return true;
  if (!session.ledMinistries.some((m) => m.id === event.ministry_id)) return false;
  return leaderCount <= 1 || event.created_by === session.profile.id;
}
