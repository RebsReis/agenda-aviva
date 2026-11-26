// Datas sempre no fuso de São Paulo (o Brasil não tem horário de verão desde 2019)
export const TZ = "America/Sao_Paulo";
export const OFFSET = "-03:00";

export type View = "semana" | "mes" | "ano";

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "AAAA-MM-DD" de hoje em São Paulo */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Converte "AAAA-MM-DD" em Date UTC ao meio-dia (evita problemas de fuso nas contas) */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toISO(d);
}

export function isValidDay(iso: string | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(parseDay(iso).getTime());
}

/** Intervalo [início, fim) em dias ISO para cada visualização */
export function rangeFor(view: View, iso: string): { start: string; end: string } {
  const d = parseDay(iso);
  if (view === "semana") {
    const start = addDays(iso, -d.getUTCDay()); // começa no domingo
    return { start, end: addDays(start, 7) };
  }
  if (view === "mes") {
    const start = `${iso.slice(0, 7)}-01`;
    return { start, end: addMonths(start, 1) };
  }
  const start = `${iso.slice(0, 4)}-01-01`;
  return { start, end: `${Number(iso.slice(0, 4)) + 1}-01-01` };
}

/** Timestamp ISO -> dia "AAAA-MM-DD" em São Paulo */
export function dayOf(ts: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts));
}

export function timeOf(ts: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}

export function longDate(ts: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(ts));
}

export function dayLabel(iso: string): string {
  const d = parseDay(iso);
  return `${DIAS_CURTOS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()].toLowerCase()}`;
}

/** Junta data e hora do formulário num timestamp com fuso de São Paulo */
export function toTimestamp(date: string, time: string): string {
  return `${date}T${time || "00:00"}:00${OFFSET}`;
}
