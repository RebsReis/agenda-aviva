"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// O banco só aceita estas operações se quem chama for o admin (RLS).

function color(v: FormDataEntryValue | null) {
  const c = String(v ?? "");
  return /^#[0-9A-Fa-f]{6}$/.test(c) ? c : "#E4731D";
}

export async function createMinistry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) return;
  const leader = String(formData.get("leader_id") ?? "") || null;
  const supabase = await createClient();
  const { data } = await supabase.from("ministries").insert({ name, color: color(formData.get("color")) }).select("id").single();
  if (data && leader) await supabase.from("ministry_leaders").insert({ ministry_id: data.id, user_id: leader });
  revalidatePath("/admin");
}

export async function updateMinistry(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  await supabase
    .from("ministries")
    .update({
      name: name.length >= 2 ? name : undefined,
      color: color(formData.get("color")),
      publica_avisos: formData.get("publica_avisos") === "on",
    })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addLeader(ministryId: string, formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("ministry_leaders").insert({ ministry_id: ministryId, user_id: userId });
  revalidatePath("/admin");
}

export async function removeLeader(ministryId: string, userId: string) {
  const supabase = await createClient();
  await supabase.from("ministry_leaders").delete().eq("ministry_id", ministryId).eq("user_id", userId);
  revalidatePath("/admin");
}

export async function deleteMinistry(id: string) {
  const supabase = await createClient();
  await supabase.from("ministries").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setSecretary(formData: FormData) {
  const id = String(formData.get("user_id") ?? "") || null;
  const supabase = await createClient();
  await supabase.rpc("set_secretary", { p_user: id });
  revalidatePath("/admin");
}
