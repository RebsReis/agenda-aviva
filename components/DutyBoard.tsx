import { dayLabel } from "@/lib/dates";
import { groupDuties } from "@/lib/mural";
import { createDuty, deleteDuty, updateDuty } from "@/app/mural/actions";
import type { Duty } from "@/lib/types";

/** "Escala do som", "Escala das luzes", "Escala de limpeza"... */
function tituloEscala(category: string) {
  const c = category.toLowerCase();
  const artigo: Record<string, string> = { som: "do", datashow: "do", luzes: "das" };
  return `Escala ${artigo[c] ?? "de"} ${c}`;
}

/**
 * Quadro de escalas (da igreja ou de um ministério), com edição para quem pode.
 * Sem "editable", é só leitura.
 */
export default function DutyBoard({
  duties,
  today,
  start,
  editable = false,
  ministryId = null,
  types,
  compact = false,
}: {
  duties: Duty[];
  today: string;
  start: string;
  editable?: boolean;
  ministryId?: string | null;
  types: string[];
  compact?: boolean;
}) {
  const listId = `tipos-${ministryId ?? "igreja"}`;
  return (
    <div className="space-y-3">
      <datalist id={listId}>{types.map((s) => <option key={s} value={s} />)}</datalist>
      {!duties.length && !compact && <p className="rounded-2xl bg-white p-5 text-sm text-tinta/50 shadow-sm">Nenhuma escala neste mês.</p>}

      {groupDuties(duties).map(([category, list]) => {
        const next = list.find((d) => d.duty_date >= today);
        return (
          <div key={category} className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-extrabold">{tituloEscala(category)}</h3>
            <ul className="mt-2 divide-y divide-creme-escuro">
              {list.map((d) => (
                <li
                  key={d.id}
                  className={`flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg px-1 py-2 text-sm ${d.duty_date < today ? "opacity-40" : ""} ${d.id === next?.id ? "bg-creme font-bold" : ""}`}
                >
                  <span className="w-24 shrink-0 font-semibold text-tinta/60">{dayLabel(d.duty_date).replace(/ de [^ ]+$/, "")}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{d.assignees}</span>
                    {d.notes && <span className="block text-xs font-normal text-tinta/60">{d.notes}</span>}
                  </span>
                  {d.id === next?.id && <span className="text-[11px] font-extrabold uppercase text-aviva">Próxima</span>}
                  {editable && (
                    <form action={deleteDuty.bind(null, d.id)}>
                      <button className="text-xs font-semibold text-red-600">Remover</button>
                    </form>
                  )}
                  {editable && (
                    <details className="basis-full font-normal">
                      <summary className="cursor-pointer text-xs font-bold text-aviva underline">Alterar</summary>
                      <form action={updateDuty.bind(null, d.id)} className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input name="category" defaultValue={d.category} list={listId} className="campo py-2" maxLength={60} required />
                        <input name="duty_date" type="date" defaultValue={d.duty_date} className="campo py-2" required />
                        <input name="assignees" defaultValue={d.assignees} className="campo py-2" maxLength={300} required />
                        <input name="notes" defaultValue={d.notes ?? ""} placeholder="Observação" className="campo py-2" maxLength={500} />
                        <button className="botao py-2 sm:col-span-2">Salvar</button>
                      </form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {editable && (
        <form action={createDuty} className="space-y-3 rounded-2xl border-2 border-dashed border-aviva/40 p-4">
          <p className="font-bold">Adicionar à escala</p>
          {ministryId && <input type="hidden" name="ministry_id" value={ministryId} />}
          {ministryId ? (
            <select name="category" className="campo" defaultValue={types[0]} required>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          ) : (
            <input name="category" list={listId} className="campo" placeholder="Tipo (ex.: Limpeza)" defaultValue={types[0]} maxLength={60} required />
          )}
          <input name="duty_date" type="date" className="campo" defaultValue={start < today ? today : start} required />
          <input name="assignees" className="campo" placeholder="Responsáveis (ex.: Lucas e Pedro)" maxLength={300} required />
          <input name="notes" className="campo" placeholder="Observação (opcional)" maxLength={500} />
          <button className="botao w-full">Adicionar</button>
        </form>
      )}
    </div>
  );
}
