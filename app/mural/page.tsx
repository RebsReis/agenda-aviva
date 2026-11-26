import Link from "next/link";
import Header from "@/components/Header";
import { requireSession } from "@/lib/auth";
import { MESES, addMonths, parseDay, todayISO } from "@/lib/dates";
import { loadMural } from "@/lib/mural";
import DutyBoard from "@/components/DutyBoard";
import { ESCALAS_IGREJA } from "@/lib/types";
import Birthdays from "@/components/Birthdays";
import Giving from "@/components/Giving";
import PixForm from "@/components/PixForm";
import TwoFactorVerify from "@/components/TwoFactorVerify";
import {
  createAnnouncement, createBirthday, deleteAnnouncement, deleteBirthday, togglePin,
  updateAnnouncement, updateBirthday, updateGiving,
} from "./actions";

export default async function MuralPage({ searchParams }: { searchParams: Promise<{ m?: string; pix?: string }> }) {
  const session = await requireSession();
  const { m, pix } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : todayISO();
  const { today, start, announcements, duties, birthdays, giving } = await loadMural(month);
  const podeAvisos = session.canManageAvisos;
  const podeApagarAvisos = session.canDeleteAvisos;
  const podeEscalas = session.canManageEscalas;
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
          <p className="mt-1 text-sm font-semibold opacity-90">Avisos, escalas, aniversariantes, dízimos e ofertas.</p>
          {session.isSecretary && <p className="mt-2 inline-block rounded-lg bg-white/20 px-2 py-1 text-xs font-bold">Você cuida das escalas da igreja e dos aniversariantes</p>}
          {!session.isAdmin && session.ledMinistries.some((x) => x.publica_avisos) && <p className="mt-2 inline-block rounded-lg bg-white/20 px-2 py-1 text-xs font-bold">Mídia: você divulga os avisos (as escalas da Mídia ficam no filtro Mídia da agenda)</p>}
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
                {podeAvisos && (
                  <>
                    <div className="mt-3 flex gap-4 text-xs font-bold">
                      <form action={togglePin.bind(null, a.id, a.pinned)}><button className="underline">{a.pinned ? "Desafixar" : "Fixar no topo"}</button></form>
                      {podeApagarAvisos && <form action={deleteAnnouncement.bind(null, a.id)}><button className={a.pinned ? "underline" : "text-red-600 underline"}>Apagar</button></form>}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-bold underline">Editar aviso</summary>
                      <form action={updateAnnouncement.bind(null, a.id)} className="mt-3 space-y-2 text-tinta">
                        <input name="title" defaultValue={a.title} className="campo" maxLength={120} required />
                        <textarea name="body" defaultValue={a.body ?? ""} className="campo min-h-24" maxLength={3000} />
                        <label className={`block text-sm font-semibold ${a.pinned ? "text-white" : ""}`}>
                          Mostrar até (opcional)
                          <input name="expires_on" type="date" defaultValue={a.expires_on ?? ""} className="campo mt-1" />
                        </label>
                        <label className="flex items-center gap-2 rounded-xl bg-creme px-3 py-3 text-sm font-semibold">
                          <input type="checkbox" name="pinned" defaultChecked={a.pinned} className="h-5 w-5 accent-aviva" /> Destacar como importante
                        </label>
                        <button className={a.pinned ? "w-full rounded-xl bg-white px-5 py-3 font-bold text-aviva" : "botao w-full"}>Salvar alterações</button>
                      </form>
                    </details>
                  </>
                )}
              </article>
            ))}
          </div>

          {podeAvisos && (
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

          <div className="mt-3">
            <DutyBoard duties={duties} today={today} start={start} editable={podeEscalas} types={ESCALAS_IGREJA} />
          </div>

        </section>

        {/* ANIVERSARIANTES */}
        <section>
          <h2 className="titulo text-3xl text-aviva">Aniversariantes</h2>
          <p className="font-script text-2xl text-tinta/60">{MESES[d0.getUTCMonth()].toLowerCase()}</p>
          <div className="mt-3">
            {birthdays.length ? (
              <Birthdays birthdays={birthdays} today={today} start={start} />
            ) : (
              <p className="rounded-2xl bg-white p-5 text-sm text-tinta/50 shadow-sm">Nenhum aniversariante cadastrado neste mês.</p>
            )}
          </div>

          {podeEscalas && birthdays.length > 0 && (
            <ul className="mt-3 divide-y divide-creme-escuro rounded-2xl bg-white px-4 shadow-sm">
              {birthdays.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span><b>{String(b.day).padStart(2, "0")}/{String(b.month).padStart(2, "0")}</b> · {b.name}</span>
                      <span className="text-xs font-bold text-aviva underline">Alterar</span>
                    </summary>
                    <form action={updateBirthday.bind(null, b.id)} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input name="name" defaultValue={b.name} className="campo py-2" maxLength={80} required />
                      <input name="date" type="date" defaultValue={`2000-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`} className="campo py-2" required />
                      <button className="botao py-2">Salvar</button>
                    </form>
                    <form action={deleteBirthday.bind(null, b.id)} className="mt-1 text-right">
                      <button className="text-xs font-semibold text-red-600">Remover</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}

          {podeEscalas && (
            <form action={createBirthday} className="mt-4 space-y-3 rounded-2xl border-2 border-dashed border-aviva/40 p-4">
              <p className="font-bold">Adicionar aniversariante</p>
              <input name="name" className="campo" placeholder="Nome (ex.: Maria Souza)" maxLength={80} required />
              <label className="block text-sm font-semibold">
                Data de aniversário <span className="font-normal text-tinta/50">(o ano não é guardado nem exibido)</span>
                <input name="date" type="date" className="campo mt-1" required />
              </label>
              <p className="text-xs text-tinta/60">Cadastre só quem autorizou aparecer no mural.</p>
              <button className="botao w-full">Adicionar</button>
            </form>
          )}
        </section>

        {/* DÍZIMOS E OFERTAS */}
        <section id="dizimos" className="scroll-mt-20">
          <h2 className="titulo text-3xl text-aviva">Dízimos e ofertas</h2>
          {pix === "ok" && <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Dados do Pix atualizados.</p>}
          {pix === "confere" && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">As duas chaves digitadas não conferem. Nada foi alterado.</p>}
          {pix === "2fa" && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Alteração recusada: confirme com o código do autenticador e tente de novo.</p>}
          <div className="mt-3">
            {giving?.pix_key ? <Giving giving={giving} /> : (
              <p className="rounded-2xl bg-white p-5 text-sm text-tinta/50 shadow-sm">Os dados para contribuição serão publicados em breve.</p>
            )}
          </div>
          {podeAvisos && giving && (
            <details className="mt-4 rounded-2xl border-2 border-dashed border-aviva/40 p-4">
              <summary className="cursor-pointer font-bold">Alterar dados do Pix</summary>
              {!session.hasTwoFactor ? (
                <div className="mt-3 space-y-3 text-sm">
                  <p>Para proteger as ofertas, alterar o Pix exige a <b>verificação em duas etapas</b>.</p>
                  <Link href="/seguranca" className="botao w-full">Ativar verificação em duas etapas</Link>
                </div>
              ) : !session.twoFactor ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p>Digite o código do aplicativo autenticador para liberar a alteração.</p>
                  <TwoFactorVerify next="/mural#dizimos" compact />
                </div>
              ) : (
                <PixForm giving={giving} action={updateGiving.bind(null, giving.id)} />
              )}
            </details>
          )}
        </section>
      </main>
    </>
  );
}
