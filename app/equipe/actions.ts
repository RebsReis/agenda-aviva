"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Líderes (e a admin) montam a equipe do ministério pelo e-mail de cadastro.
// O banco confere a permissão e não expõe a lista de cadastrados.

export async function addMember(ministryId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const back = `/?m=${ministryId}`;
  if (!email.includes("@")) redirect(`${back}&equipe=${encodeURIComponent("Digite um e-mail válido.")}#equipe`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_ministry_member", { p_ministry: ministryId, p_email: email });
  revalidatePath("/");
  if (error) {
    const msg = error.message.includes("Nenhuma conta")
      ? "Nenhuma conta com este e-mail. A pessoa precisa se cadastrar no app primeiro."
      : "Não foi possível adicionar.";
    redirect(`${back}&equipe=${encodeURIComponent(msg)}#equipe`);
  }
  redirect(`${back}&equipe=${encodeURIComponent(`${data} entrou na equipe!`)}&ok=1#equipe`);
}

export async function removeMember(ministryId: string, userId: string) {
  const supabase = await createClient();
  await supabase.from("ministry_members").delete().eq("ministry_id", ministryId).eq("user_id", userId);
  revalidatePath("/");
}
