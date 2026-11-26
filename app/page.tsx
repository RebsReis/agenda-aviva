import Link from "next/link";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DIAS_CURTOS, MESES, OFFSET, addDays, addMonths, dayLabel, dayOf, isValidDay, parseDay, rangeFor, todayISO, type View,
} from "@/lib/dates";
import type { EventRow, Ministry } from "@/lib/types";

type Search = { v?: string; d?: string; m?: string };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const view: View = sp.v === "semana" || sp.v === "ano" ? sp.v : "mes";
  const today = todayISO();
  const day = isValidDay(sp.d) ? sp.d : today;
  const ministryFilter = sp.m ?? "";
  const { start, end } = rangeFor(view, day);

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*, ministries(id, name, color)")
    .gte("starts_at", `${start}T00:00:00${OFFSET}`)
    .lt("starts_at", `${end}T00:00:00${OFFSET}`)
    .order("starts_at");
  if (ministryFilter) query = query.eq("ministry_id", ministryFilter);
  const [{ data: eventsData }, { data: ministriesData }] = await Promise.all([
    query,
    supabase.from("ministries").select("id, name, color").order("name"),
  ]);
  const events = (eventsData ?? []) as EventRow[];
  const ministries = (ministriesData ?? []) as Pick<Ministry, "id" | "name" | "color">[];

  const byDay = new Map<string, EventRow[]>();
  for (const e of events) {
    const k = dayOf(e.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const link = (p: Partial<Search>) => {
    const q = new URLSearchParams({ v: p.v ?? view, d: p.d ?? day });
    const m = p.m ?? ministryFilter;
    if (m) q.set("m", m);
    return `/?${q.toString()}`;
  };

  const prev = view === "semana" ? addDays(day, -7) : view === "mes" ? addMonths(day, -1) : `${Number(day.slice(0, 4)) - 1}-01-01`;
  const next = view === "semana" ? addDays(day, 7) : view === "mes" ? addMonths(day, 1) : `${Number(day.slice(0, 4)) + 1}-01-01`;

  const d0 = parseDay(day);
  const title =
    view === "ano"
      ? String(d0.getUTCFullYear())
      : view === "mes"
        ? `${MESES[d0.getUTCMonth()]}`
        : `${parseDay(start).getUTCDate()}–${parseDay(addDays(end, -1)).getUTCDate()} ${MESES[parseDay(addDays(end, -1)).getUTCMonth()].slice(0, 3)}`;

  return (
    <>
      <Header session={session} />
      <section className="meio-tom bg-aviva pb-6 text-white">
        <div className="mx-auto max-w-3xl px-4">
          <p className="pt-2 font-script text-2xl">acompanhe tudo o que vai rolar</p>
          <div className="flex items-end justify-between gap-2">
            <h1 className="titulo text-5xl sm:text-6xl">{title}</h1>
            <div className="flex gap-2 pb-1">
              <Link href={link({ d: prev })} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-xl font-bold" aria-label="Anterior">‹</Link>
              <Link href={link({ d: today })} className="grid h-10 place-items-center rounded-full bg-white px-3 text-sm font-bold text-aviva">Hoje</Link>
              <Link href={link({ d: next })} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-xl font-bold" aria-label="Próximo">›</Link>
            </div>
          </div>
          {view !== "ano" && <p className="mt-1 text-sm font-semibold opacity-90">{d0.getUTCFullYear()}</p>}

          <div className="mt-4 grid grid-cols-3 rounded-xl bg-white/15 p-1 text-sm font-bold">
            {(["semana", "mes", "ano"] as View[]).map((v) => (
              <Link key={v} href={link({ v })} className={`rounded-lg py-2 text-center ${view === v ? "bg-white text-aviva shadow" : ""}`}>
                {v === "semana" ? "Semana" : v === "mes" ? "Mês" : "Ano"}
              </Link>
            ))}
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 text-xs font-bold">
            <Link href={link({ m: "" }).replace(/&m=[^&]*/, "")} className={`shrink-0 rounded-full px-3 py-1.5 ${!ministryFilter ? "bg-tinta text-white" : "bg-white/20"}`}>Todos</Link>
            {ministries.map((m) => (
              <Link key={m.id} href={link({ m: m.id })} className={`shrink-0 rounded-full px-3 py-1.5 ${ministryFilter === m.id ? "bg-tinta text-white" : "bg-white/20"}`}>
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {view === "mes" && <MonthGrid day={day} byDay={byDay} today={today} link={link} />}

        {view === "ano" ? (
          <YearView year={d0.getUTCFullYear()} events={events} link={link} />
        ) : (
          <DayList start={start} end={end} byDay={byDay} today={today} showEmpty={view === "semana"} />
        )}

        {session.canEdit && (
          <Link href="/eventos/novo" className="botao fixed bottom-6 right-6 z-10 h-14 rounded-full px-6 shadow-xl">
            + Evento
          </Link>
        )}
      </main>
    </>
  );
}

function MonthGrid({ day, byDay, today, link }: { day: string; byDay: Map<string, EventRow[]>; today: string; link: (p: Partial<Search>) => string }) {
  const first = `${day.slice(0, 7)}-01`;
  const lead = parseDay(first).getUTCDay();
  const daysInMonth = parseDay(addDays(addMonths(first, 1), -1)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  return (
    <div className="mb-6 rounded-2xl bg-white p-3 shadow-sm">
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-tinta/50">
        {DIAS_CURTOS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) =>
          c ? (
            <Link
              key={c}
              href={link({ v: "semana", d: c })}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold ${c === today ? "bg-aviva text-white" : "hover:bg-creme"}`}
            >
              {Number(c.slice(8))}
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {(byDay.get(c) ?? []).slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: c === today ? "#fff" : e.ministries?.color ?? "#E4731D" }} />
                ))}
              </span>
            </Link>
          ) : (
            <div key={`v${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

function DayList({ start, end, byDay, today, showEmpty }: { start: string; end: string; byDay: Map<string, EventRow[]>; today: string; showEmpty: boolean }) {
  const days: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d);
  const visible = days.filter((d) => showEmpty || byDay.has(d));
  if (!visible.length) return <Empty />;
  return (
    <div className="space-y-5">
      {visible.map((d) => (
        <div key={d}>
          <h2 className={`mb-2 text-sm font-extrabold uppercase tracking-wide ${d === today ? "text-aviva" : "text-tinta/60"}`}>
            {d === today ? "Hoje · " : ""}{dayLabel(d)}
          </h2>
          <div className="space-y-2">
            {(byDay.get(d) ?? []).map((e) => <EventCard key={e.id} event={e} />)}
            {!byDay.has(d) && <p className="rounded-xl border-2 border-dashed border-creme-escuro px-4 py-3 text-sm text-tinta/40">Nada programado</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function YearView({ year, events, link }: { year: number; events: EventRow[]; link: (p: Partial<Search>) => string }) {
  if (!events.length) return <Empty />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MESES.map((nome, i) => {
        const mm = String(i + 1).padStart(2, "0");
        const list = events.filter((e) => dayOf(e.starts_at).slice(0, 7) === `${year}-${mm}`);
        return (
          <Link key={nome} href={link({ v: "mes", d: `${year}-${mm}-01` })} className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-baseline justify-between">
              <h3 className="titulo text-2xl text-aviva">{nome}</h3>
              <span className="text-xs font-bold text-tinta/50">{list.length} {list.length === 1 ? "evento" : "eventos"}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {list.slice(0, 4).map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="w-6 shrink-0 font-bold text-tinta/50">{Number(dayOf(e.starts_at).slice(8))}</span>
                  <span className="truncate">{e.title}</span>
                </li>
              ))}
              {list.length > 4 && <li className="text-xs font-semibold text-aviva">+ {list.length - 4} mais</li>}
            </ul>
          </Link>
        );
      })}
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="font-script text-3xl text-aviva">nada por aqui ainda</p>
      <p className="mt-1 text-sm text-tinta/60">Nenhum evento neste período.</p>
    </div>
  );
}
