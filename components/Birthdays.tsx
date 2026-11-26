import { MESES, parseDay } from "@/lib/dates";
import type { Birthday } from "@/lib/types";

/** Aniversariantes do mês (só dia e mês) */
export default function Birthdays({ birthdays, today, start }: { birthdays: Birthday[]; today: string; start: string }) {
  if (!birthdays.length) return null;
  const month = parseDay(start).getUTCMonth();
  const sameMonth = today.slice(0, 7) === start.slice(0, 7);
  const todayDay = Number(today.slice(8));
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="font-extrabold">
        🎉 Aniversariantes <span className="font-script text-xl font-normal text-aviva">de {MESES[month].toLowerCase()}</span>
      </h3>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {birthdays.map((b) => {
          const isToday = sameMonth && b.day === todayDay;
          return (
            <li key={b.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${isToday ? "bg-aviva font-bold text-white" : ""}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${isToday ? "bg-white text-aviva" : "bg-creme text-aviva"}`}>
                {String(b.day).padStart(2, "0")}
              </span>
              <span className="flex-1">{b.name}</span>
              {isToday && <span className="text-[11px] font-extrabold uppercase">Hoje!</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
