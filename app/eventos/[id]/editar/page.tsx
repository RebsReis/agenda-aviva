import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import EventForm from "@/components/EventForm";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent, updateEvent } from "@/app/eventos/actions";
import type { EventRow, Ministry } from "@/lib/types";

export default async function EditarEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const event = data as EventRow;

  const isLeader = session.ledMinistries.some((m) => m.id === event.ministry_id);
  if (!session.isAdmin && !isLeader) redirect(`/eventos/${id}`);

  let ministries: Ministry[] = session.ledMinistries;
  if (session.isAdmin) {
    const { data: all } = await supabase.from("ministries").select("*").order("name");
    ministries = (all ?? []) as Ministry[];
  }

  return (
    <>
      <Header session={session} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href={`/eventos/${id}`} className="text-sm font-semibold text-aviva">‹ Voltar</Link>
        <h1 className="titulo mt-2 text-4xl text-aviva">Editar evento</h1>
        {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <EventForm action={updateEvent.bind(null, id)} ministries={ministries} event={event} submitLabel="Salvar alterações" />
        </div>
        <form action={deleteEvent.bind(null, id)} className="mt-4">
          <button className="w-full rounded-xl border-2 border-red-200 px-5 py-3 font-bold text-red-600 hover:bg-red-50">
            Excluir evento
          </button>
        </form>
      </main>
    </>
  );
}
