import Link from "next/link";
import { MESES, dayLabel, parseDay } from "@/lib/dates";
import { groupDuties } from "@/lib/mural";
import type { Announcement, Duty } from "@/lib/types";

/** Bloco do mural que aparece no topo da tela inicial, para todos */
export default function Mural({
  announcements,
  duties,
  today,
  start,
}: {
  announcements: Announcement[];
  duties: Duty[];
  today: string;
  start: string;
}) {
  if (!announcements.length && !duties.length) return null;
  const mes = MESES[parseDay(start).getUTCMonth()].toLowerCase();

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="titulo text-3xl text-aviva">Mural da igreja</h2>
        <Link href="/mural" className="text-sm font-bold text-aviva">Ver tudo ›</Link>
      </div>

      {announcements.slice(0, 3).map((a) => (
        <article key={a.id} className={`rounded-2xl p-4 shadow-sm ${a.pinned ? "meio-tom bg-aviva text-white" : "bg-white"}`}>
          {a.pinned && <span className="selo mb-2">Importante</span>}
          <h3 className="text-lg font-extrabold">{a.title}</h3>
          {a.body && <p className={`mt-1 line-clamp-3 whitespace-pre-line text-sm ${a.pinned ? "opacity-95" : "text-tinta/70"}`}>{a.body}</p>}
        </article>
      ))}
      {announcements.length > 3 && (
        <Link href="/mural" className="block text-center text-sm font-bold text-aviva">+ {announcements.length - 3} avisos</Link>
      )}

      {groupDuties(duties).map(([category, list]) => {
        const next = list.find((d) => d.duty_date >= today);
        return (
          <div key={category} className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-extrabold">
              Escala de {category.toLowerCase()} <span className="font-script text-xl font-normal text-aviva">de {mes}</span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {list.map((d) => {
                const isNext = d.id === next?.id;
                const past = d.duty_date < today;
                return (
                  <li
                    key={d.id}
                    className={`flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-sm ${isNext ? "bg-creme font-bold" : ""} ${past ? "opacity-40" : ""}`}
                  >
                    <span className="w-28 shrink-0 text-tinta/60">{dayLabel(d.duty_date).replace(/ de [^ ]+$/, "")}</span>
                    <span className="flex-1">{d.assignees}</span>
                    {isNext && <span className="text-[11px] font-extrabold uppercase text-aviva">Próxima</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
