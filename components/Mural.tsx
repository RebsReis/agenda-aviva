import Link from "next/link";
import DutyBoard from "@/components/DutyBoard";
import Birthdays from "@/components/Birthdays";
import Giving from "@/components/Giving";
import type { Announcement, Birthday, Duty, GivingInfo } from "@/lib/types";

/** Bloco do mural que aparece no topo da tela inicial, para todos */
export default function Mural({
  announcements,
  duties,
  birthdays,
  giving,
  today,
  start,
}: {
  announcements: Announcement[];
  duties: Duty[];
  birthdays: Birthday[];
  giving: GivingInfo | null;
  today: string;
  start: string;
}) {
  if (!announcements.length && !duties.length && !birthdays.length && !giving?.pix_key) return null;

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

      <DutyBoard duties={duties} today={today} start={start} types={[]} compact />

      <Birthdays birthdays={birthdays} today={today} start={start} />
      <Giving giving={giving} />
    </section>
  );
}
