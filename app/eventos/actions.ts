"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toTimestamp } from "@/lib/dates";

// As permissões de verdade ficam no banco (RLS). Aqui só validamos o formulário.

function readEvent(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || title.length < 2) {
    throw new Error("Preencha título, data e horário.");
  }
  return {
    ministry_id: String(formData.get("ministry_id")),
    title: title.slice(0, 120),
    description: String(formData.get("description") ?? "").trim().slice(0, 5000) || null,
    location: String(formData.get("location") ?? "").trim().slice(0, 200) || null,
    starts_at: toTimestamp(date, start),
    ends_at: /^\d{2}:\d{2}$/.test(end) ? toTimestamp(date, end) : null,
  };
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase
    .from("events")
    .insert({ ...readEvent(formData), created_by: user.id })
    .select("id")
    .single();
  if (error) redirect(`/eventos/novo?erro=${encodeURIComponent("Você não tem permissão para criar eventos neste ministério.")}`);
  revalidatePath("/");
  redirect(`/eventos/${data.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update(readEvent(formData)).eq("id", id).select("id");
  if (error || !data?.length) redirect(`/eventos/${id}/editar?erro=${encodeURIComponent("Você não tem permissão para editar este evento.")}`);
  revalidatePath("/");
  redirect(`/eventos/${id}`);
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function askQuestion(eventId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) return;
  const supabase = await createClient();
  await supabase.from("questions").insert({ event_id: eventId, body: body.slice(0, 1000) });
  revalidatePath(`/eventos/${eventId}`);
}

export async function answerQuestion(eventId: string, questionId: string, formData: FormData) {
  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer) return;
  const supabase = await createClient();
  await supabase.rpc("answer_question", { p_question: questionId, p_answer: answer });
  revalidatePath(`/eventos/${eventId}`);
}

export async function deleteQuestion(eventId: string, questionId: string) {
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", questionId);
  revalidatePath(`/eventos/${eventId}`);
}
