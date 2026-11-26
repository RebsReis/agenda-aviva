import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { canManageEvent, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { longDate, timeOf } from "@/lib/dates";
import { answerQuestion, askQuestion, deleteQuestion } from "@/app/eventos/actions";
import type { EventRow, MinistryLeader, Question } from "@/lib/types";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: ev }, { data: qs }] = await Promise.all([
    supabase.from("events").select("*, ministries(id, name, color, ministry_leaders(user_id, leader_name))").eq("id", id).maybeSingle(),
    supabase.from("questions").select("*").eq("event_id", id).order("created_at"),
  ]);
  if (!ev) notFound();
  const event = ev as EventRow & { ministries: { id: string; name: string; color: string; ministry_leaders: MinistryLeader[] } };
  const questions = (qs ?? []) as Question[];
  const color = event.ministries?.color ?? "#E4731D";
  const leaders = event.ministries?.ministry_leaders ?? [];
  const canManage = canManageEvent(session, event, leaders.length);
  // Ministério com várias líderes: mostra a responsável pelo evento
  const responsavel = leaders.length > 1 ? event.responsible_name : leaders[0]?.leader_name;

  return (
    <>
      <Header session={session} />
      <section className="meio-tom pb-8 pt-4 text-white" style={{ background: color }}>
        <div className="mx-auto max-w-3xl px-4">
          <Link href="/" className="text-sm font-semibold opacity-90">‹ Agenda</Link>
          <div className="mt-3"><span className="selo" style={{ color }}>{event.ministries?.name}</span></div>
          <h1 className="titulo mt-3 text-5xl">{event.title}</h1>
          <p className="mt-3 font-semibold capitalize">{longDate(event.starts_at)}</p>
          <p className="font-semibold">
            {timeOf(event.starts_at)}{event.ends_at ? ` às ${timeOf(event.ends_at)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          {responsavel && <p className="mt-1 text-sm opacity-90">{leaders.length > 1 ? "Responsável" : "Líder"}: {responsavel}</p>}
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {canManage && (
          <Link href={`/eventos/${id}/editar`} className="botao-sec w-full">Editar evento</Link>
        )}

        {event.description && (
          <article className="whitespace-pre-line rounded-2xl bg-white p-5 leading-relaxed shadow-sm">{event.description}</article>
        )}

        <section>
          <h2 className="titulo text-3xl text-aviva">Perguntas</h2>
          <p className="font-script text-xl text-tinta/60">ficou com alguma dúvida? pergunta aqui!</p>

          <form action={askQuestion.bind(null, id)} className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <textarea name="body" className="campo min-h-24" placeholder="Escreva sua pergunta..." maxLength={1000} required minLength={2} />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-tinta/50">Seu nome aparecerá para os membros.</span>
              <button className="botao py-2">Perguntar</button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            {!questions.length && <p className="text-center text-sm text-tinta/50">Nenhuma pergunta ainda.</p>}
            {questions.map((q) => {
              const mine = q.author_id === session.profile.id;
              return (
                <div key={q.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{q.author_name}</p>
                      <p className="mt-1 whitespace-pre-line">{q.body}</p>
                    </div>
                    {(mine || canManage) && (
                      <form action={deleteQuestion.bind(null, id, q.id)}>
                        <button className="text-xs font-semibold text-tinta/40 hover:text-red-600" aria-label="Apagar pergunta">Apagar</button>
                      </form>
                    )}
                  </div>

                  {q.answer ? (
                    <div className="mt-3 rounded-xl border-l-4 border-aviva bg-creme p-3">
                      <p className="text-xs font-extrabold uppercase text-aviva">
                        {q.answered_by_role === "admin" ? "Admin" : "Líder"} · {q.answered_by_name}
                      </p>
                      <p className="mt-1 whitespace-pre-line">{q.answer}</p>
                    </div>
                  ) : canManage ? (
                    <form action={answerQuestion.bind(null, id, q.id)} className="mt-3 flex gap-2">
                      <input name="answer" className="campo py-2" placeholder="Responder..." maxLength={2000} required />
                      <button className="botao py-2">Enviar</button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-tinta/40">Aguardando resposta</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
