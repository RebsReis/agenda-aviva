"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) redirect("/meus-dados?erro=Nome%20inv%C3%A1lido");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
  redirect("/meus-dados?ok=1");
}

export async function deleteAccount(formData: FormData) {
  if (!formData.get("confirm")) redirect("/meus-dados");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    redirect(
      `/meus-dados?erro=${encodeURIComponent(
        error.message.includes("administrador")
          ? "Você é a administradora: transfira o cargo antes de excluir a conta."
          : "Não foi possível excluir a conta. Tente novamente.",
      )}`,
    );
  }
  await supabase.auth.signOut();
  redirect("/login");
}
