import Link from "next/link";
import Header from "@/components/Header";
import { requireSession } from "@/lib/auth";
import { MESES, addMonths, dayLabel, parseDay, todayISO } from "@/lib/dates";
import { groupDuties, loadMural } from "@/lib/mural";
import { createAnnouncement, createDuty, deleteAnnouncement, deleteDuty, togglePin } from "./actions";

const SUGESTOES = ["Limpeza", "Recepção", "Santa Ceia", "Cantina", "Estacionamento"];

export default async function MuralPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const session = await requireSession();
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : todayISO();
  const { today, start, announcements, duties } = await loadMural(month);
  const admin = session.canManageMural;
  const d0 = parseDay(start);
  const prev = addMonths(start, -1).slice(0, 7);
  const next = addMonths(start, 1).slice(0, 7);

  return (
    <>
      <Header session={session} />
      <section className="meio-tom bg-aviva pb-8 pt-2 text-white">
        <div className="mx-auto max-w-3xl px-4">
          <p className="font-script text-2xl">fique por dentro</p>
          <h1 className="titulo text-5xl">Mural da igreja</h1>
          <p className="mt-1 text-sm font-semibold opacity-90">Avisos gerais e escalas de serviço.</p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        {/* AVISOS */}
        <section>
          <h2 className="titulo text-3xl text-aviva">Avisos</h2>
          <div className="mt-3 space-y-3">
            {!announcements.length && <p className="rounded-2xl bg-white p-5 text-sm text-tinta/50 shadow-sm">Nenhum aviso no momento.</p>}
            {announcements.map((a) => (
              <article key={a.id} className={`rounded-2xl p-5 shadow-sm ${a.pinned ? "meio-tom bg-aviva text-white" : "bg-white"}`}>
                {a.pinned && <span className="selo mb-2">Importante</span>}
                <h3 className="text-lg font-extrabold">{a.title}</h3>
                {a.body && <p className="mt-1 whitespace-pre-line leading-relaxed">{a.body}</p>}
                <p className={`mt-3 text-xs ${a.pinned ? "opacity-80" : "text-tinta/50"}`}>
                  Publicado em {new Date(a.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  {a.expires_on ? ` · até ${parseDay(a.expires_on).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                </p>
                {admin && (
                  <div className="mt-3 flex gap-4 text-xs font-bold">
                    <form action={togglePin.bind(null, a.id, a.pinned)}><button className="underline">{a.pinned ? "Desafixar" : "Fixar no topo"}</button></form>
                    <form action={deleteAnnouncement.bind(null, a.id)}><button className={a.pinned ? "underline" : "text-red-600 underline"}>Apagar</button></form>
                  </div>
                )}
              </article>
            ))}
          </div>

          {admin && (
            <form action={createAnnouncement} className="mt-4 space-y-3 rounded-2xl border-2 border-dashed border-aviva/40 p-4">
              <p className="font-bold">Novo aviso</p>
              <input name="title" className="campo" placeholder="Título (ex.: Reunião geral de membros)" maxLength={120} required />
              <textarea name="body" className="campo min-h-24" placeholder="Detalhes do aviso" maxLength={3000} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Mostrar até (opcional)
                  <input name="expires_on" type="date" className="campo mt-1" />
                </label>
                <label className="flex items-center gap-2 self-end rounded-xl bg-creme px-3 py-3 text-sm font-semibold">
                  <input type="checkbox" name="pinned" className="h-5 w-5 accent-aviva" /> Destacar como importante
                </label>
              </div>
              <button className="botao w-full">Publicar aviso</button>
            </form>
          )}
        </section>

        {/* ESCALAS */}
        <section>
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="titulo text-3xl text-aviva">Escalas</h2>
              <p className="font-script text-2xl text-tinta/60">{MESES[d0.getUTCMonth()].toLowerCase()} de {d0.getUTCFullYear()}</p>
            </div>
            <div className="flex gap-2 pb-1">
              <Link href={`/mural?m=${prev}`} className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl font-bold text-aviva shadow-sm" aria-label="Mês anterior">‹</Link>
              <Link href={`/mural?m=${next}`} className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl font-bold text-aviva shadow-sm" aria-label="Próximo mês">›</Link>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {!duties.length && <p className="rounded-2xl bg-white p-5 text-sm text-tinta/50 shadow-sm">Nenhuma escala neste mês.</p>}
            {groupDuties(duties).map(([category, list]) => (
              <div key={category} className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="font-extrabold">Escala de {category.toLowerCase()}</h3>
                <ul className="mt-2 divide-y divide-creme-escuro">
                  {list.map((d) => (
                    <li key={d.id} className={`flex items-start gap-3 py-2 text-sm ${d.duty_date < today ? "opacity-40" : ""}`}>
                      <span className="w-28 shrink-0 font-semibold text-tinta/60">{dayLabel(d.duty_date).replace(/ de [^ ]+$/, "")}</span>
                      <span className="flex-1">
                        <span className="font-semibold">{d.assignees}</span>
                        {d.notes && <span className="block text-xs text-tinta/60">{d.notes}</span>}
                      </span>
                      {admin && (
                        <form action={deleteDuty.bind(null, d.id)}>
                          <button className="text-xs font-semibold text-red-600" aria-label="Remover">Remover</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {admin && (
            <form action={createDuty} className="mt-4 space-y-3 rounded-2xl border-2 border-dashed border-aviva/40 p-4">
              <p className="font-bold">Adicionar à escala</p>
              <input name="category" list="tipos-escala" className="campo" placeholder="Tipo (ex.: Limpeza)" defaultValue="Limpeza" maxLength={60} required />
              <datalist id="tipos-escala">{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
              <input name="duty_date" type="date" className="campo" defaultValue={start < today ? today : start} required />
              <input name="assignees" className="campo" placeholder="Responsáveis (ex.: Família Souza e Ana)" maxLength={300} required />
              <input name="notes" className="campo" placeholder="Observação (opcional)" maxLength={500} />
              <button className="botao w-full">Adicionar</button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
