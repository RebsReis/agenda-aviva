import { dayOf, timeOf, todayISO } from "@/lib/dates";
import type { EventRow, Ministry } from "@/lib/types";

export default function EventForm({
  action,
  ministries,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  ministries: Ministry[];
  event?: EventRow;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field label="Ministério">
        <select name="ministry_id" className="campo" defaultValue={event?.ministry_id ?? ministries[0]?.id} required>
          {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Título">
        <input name="title" className="campo" defaultValue={event?.title} placeholder="Ex.: Culto de Celebração" maxLength={120} required />
      </Field>
      <Field label="Data">
        <input name="date" type="date" className="campo" defaultValue={event ? dayOf(event.starts_at) : todayISO()} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <input name="start" type="time" className="campo" defaultValue={event ? timeOf(event.starts_at) : "19:30"} required />
        </Field>
        <Field label="Término (opcional)">
          <input name="end" type="time" className="campo" defaultValue={event?.ends_at ? timeOf(event.ends_at) : ""} />
        </Field>
      </div>
      <Field label="Local (opcional)">
        <input name="location" className="campo" defaultValue={event?.location ?? ""} placeholder="Ex.: Templo principal" maxLength={200} />
      </Field>
      <Field label="Descrição e informações">
        <textarea name="description" className="campo min-h-36" defaultValue={event?.description ?? ""} placeholder="Programação, o que levar, contato do ministério..." maxLength={5000} />
      </Field>
      <button className="botao w-full">{submitLabel}</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
