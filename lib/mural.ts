import { createClient } from "@/lib/supabase/server";
import { addMonths, todayISO } from "@/lib/dates";
import type { Announcement, Duty } from "@/lib/types";

/** Avisos ainda válidos (fixados primeiro) e escalas de um mês */
export async function loadMural(month?: string) {
  const today = todayISO();
  const start = `${(month ?? today).slice(0, 7)}-01`;
  const end = addMonths(start, 1);
  const supabase = await createClient();
  const [{ data: a }, { data: d }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .or(`expires_on.is.null,expires_on.gte.${today}`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("duties").select("*").gte("duty_date", start).lt("duty_date", end).order("duty_date"),
  ]);
  return { today, start, announcements: (a ?? []) as Announcement[], duties: (d ?? []) as Duty[] };
}

/** Agrupa as escalas por tipo (Limpeza, Recepção...) */
export function groupDuties(duties: Duty[]) {
  const map = new Map<string, Duty[]>();
  for (const d of duties) map.set(d.category, [...(map.get(d.category) ?? []), d]);
  return [...map.entries()];
}
