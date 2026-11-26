"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Avisos: só a admin. Escalas: admin ou secretaria. (Regras RLS no banco.)

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/");
  revalidatePath("/mural");
}

export async function createAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (title.length < 2) return;
  const expires = String(formData.get("expires_on") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("announcements").insert({
    title,
    body: String(formData.get("body") ?? "").trim().slice(0, 3000) || null,
    pinned: formData.get("pinned") === "on",
    expires_on: DATE.test(expires) ? expires : null,
    created_by: user?.id,
  });
  refresh();
}

export async function togglePin(id: string, pinned: boolean) {
  const supabase = await createClient();
  await supabase.from("announcements").update({ pinned: !pinned }).eq("id", id);
  refresh();
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  refresh();
}

export async function createDuty(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim().slice(0, 60);
  const date = String(formData.get("duty_date") ?? "");
  const assignees = String(formData.get("assignees") ?? "").trim().slice(0, 300);
  if (category.length < 2 || !DATE.test(date) || assignees.length < 2) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("duties").insert({
    category,
    duty_date: date,
    assignees,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 500) || null,
    created_by: user?.id,
  });
  refresh();
}

export async function deleteDuty(id: string) {
  const supabase = await createClient();
  await supabase.from("duties").delete().eq("id", id);
  refresh();
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (title.length < 2) return;
  const expires = String(formData.get("expires_on") ?? "");
  const supabase = await createClient();
  await supabase
    .from("announcements")
    .update({
      title,
      body: String(formData.get("body") ?? "").trim().slice(0, 3000) || null,
      pinned: formData.get("pinned") === "on",
      expires_on: DATE.test(expires) ? expires : null,
    })
    .eq("id", id);
  refresh();
}

export async function updateDuty(id: string, formData: FormData) {
  const category = String(formData.get("category") ?? "").trim().slice(0, 60);
  const date = String(formData.get("duty_date") ?? "");
  const assignees = String(formData.get("assignees") ?? "").trim().slice(0, 300);
  if (category.length < 2 || !DATE.test(date) || assignees.length < 2) return;
  const supabase = await createClient();
  await supabase
    .from("duties")
    .update({ category, duty_date: date, assignees, notes: String(formData.get("notes") ?? "").trim().slice(0, 500) || null })
    .eq("id", id);
  refresh();
}

// ---------- Aniversariantes (admin ou secretaria) ----------

function readBirthday(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const [, m, d] = String(formData.get("date") ?? "").split("-").map(Number);
  if (name.length < 2 || !m || !d) return null;
  return { name, day: d, month: m };
}

export async function createBirthday(formData: FormData) {
  const data = readBirthday(formData);
  if (!data) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("birthdays").insert({ ...data, created_by: user?.id });
  refresh();
}

export async function updateBirthday(id: string, formData: FormData) {
  const data = readBirthday(formData);
  if (!data) return;
  const supabase = await createClient();
  await supabase.from("birthdays").update(data).eq("id", id);
  refresh();
}

export async function deleteBirthday(id: string) {
  const supabase = await createClient();
  await supabase.from("birthdays").delete().eq("id", id);
  refresh();
}

// ---------- Dízimos e ofertas (só admin) ----------

const PIX_TYPES = ["CNPJ", "E-mail", "Telefone", "Aleatória"];

export async function updateGiving(id: string, formData: FormData) {
  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  const type = String(formData.get("pix_key_type") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from("giving_info")
    .update({
      pix_key: text("pix_key", 120),
      pix_key_type: PIX_TYPES.includes(type) ? type : null,
      beneficiary: text("beneficiary", 120),
      bank: text("bank", 80),
      email: text("email", 120),
      message: text("message", 500),
      updated_by: user?.id,
    })
    .eq("id", id);
  refresh();
}
