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
  /** Admin ou secretaria: publica avisos e escalas */
  canManageMural: boolean;
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
    canManageMural: isAdmin || isSecretary,
  };
}
