import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import EventForm from "@/components/EventForm";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/eventos/actions";
import type { Ministry } from "@/lib/types";

export default async function NovoEventoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const session = await requireSession();
  if (!session.canEdit) redirect("/");
  const { erro } = await searchParams;

  // Admin escolhe qualquer ministério; líder só os seus
  let ministries: Ministry[] = session.ledMinistries;
  if (session.isAdmin) {
    const { data } = await (await createClient()).from("ministries").select("*").order("name");
    ministries = (data ?? []) as Ministry[];
  }

  return (
    <>
      <Header session={session} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href="/" className="text-sm font-semibold text-aviva">‹ Voltar</Link>
        <h1 className="titulo mt-2 text-4xl text-aviva">Novo evento</h1>
        {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {ministries.length ? (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <EventForm action={createEvent} ministries={ministries} submitLabel="Publicar evento" />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            Cadastre um ministério no <Link href="/admin" className="font-bold text-aviva underline">painel do admin</Link> antes de criar eventos.
          </p>
        )}
      </main>
    </>
  );
}
