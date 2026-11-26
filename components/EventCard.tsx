import Link from "next/link";
import { timeOf } from "@/lib/dates";
import type { EventRow } from "@/lib/types";

export default function EventCard({ event, showResponsible = false }: { event: EventRow; showResponsible?: boolean }) {
  const color = event.ministries?.color ?? "#E4731D";
  return (
    <Link
      href={`/eventos/${event.id}`}
      className="flex overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex w-20 shrink-0 flex-col items-center justify-center py-3 text-white" style={{ background: color }}>
        <span className="titulo text-2xl">{timeOf(event.starts_at)}</span>
        {event.ends_at && <span className="text-[11px] font-semibold opacity-90">até {timeOf(event.ends_at)}</span>}
      </div>
      <div className="min-w-0 flex-1 px-4 py-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color }}>{event.ministries?.name}</span>
        <h3 className="truncate text-base font-bold">{event.title}</h3>
        {event.location && <p className="truncate text-sm text-tinta/60">📍 {event.location}</p>}
        {showResponsible && event.responsible_name && <p className="truncate text-xs text-tinta/50">Responsável: {event.responsible_name}</p>}
      </div>
    </Link>
  );
}
