import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createMinistry, deleteMinistry, setSecretary, updateMinistry } from "./actions";
import type { Ministry, Profile } from "@/lib/types";

const ACOES: Record<string, string> = { INSERT: "criou", UPDATE: "editou", DELETE: "apagou" };
const ENTIDADES: Record<string, string> = { events: "evento", ministries: "ministério", questions: "pergunta", announcements: "aviso", duties: "escala", secretaria: "secretaria(o)" };

export default async function AdminPage() {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/");
  const supabase = await createClient();

  const [{ data: mins }, { data: people }, { data: logs }] = await Promise.all([
    supabase.from("ministries").select("*").order("name"),
    supabase.from("profiles").select("id, full_name, email, role, created_at").order("full_name"),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  const ministries = (mins ?? []) as Ministry[];
  const profiles = (people ?? []) as Profile[];
  const nameOf = new Map(profiles.map((p) => [p.id, p.full_name]));
  const secretary = profiles.find((p) => p.role === "secretaria");

  const LeaderSelect = ({ value }: { value?: string | null }) => (
    <select name="leader_id" defaultValue={value ?? ""} className="campo py-2">
      <option value="">Sem líder</option>
      {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
    </select>
  );

  return (
    <>
      <Header session={session} />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        <div>
          <p className="font-script text-2xl text-tinta/60">painel da</p>
          <h1 className="titulo text-5xl text-aviva">Administração</h1>
        </div>

        <section>
          <h2 className="titulo text-2xl">Ministérios e líderes</h2>
          <p className="text-sm text-tinta/60">Cada ministério tem um líder, que só edita os eventos do próprio ministério.</p>

          <div className="mt-3 space-y-3">
            {ministries.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <form action={updateMinistry.bind(null, m.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input name="name" defaultValue={m.name} className="campo py-2" required />
                  <LeaderSelect value={m.leader_id} />
                  <input name="color" type="color" defaultValue={m.color} className="h-11 w-full rounded-xl sm:w-14" aria-label="Cor" />
                  <button className="botao py-2">Salvar</button>
                </form>
                <form action={deleteMinistry.bind(null, m.id)} className="mt-2 text-right">
                  <button className="text-xs font-semibold text-red-600">Excluir ministério (apaga os eventos dele)</button>
                </form>
              </div>
            ))}
          </div>

          <form action={createMinistry} className="mt-4 grid gap-2 rounded-2xl border-2 border-dashed border-aviva/40 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input name="name" placeholder="Novo ministério (ex.: Louvor)" className="campo py-2" required />
            <LeaderSelect />
            <input name="color" type="color" defaultValue="#E4731D" className="h-11 w-full rounded-xl sm:w-14" aria-label="Cor" />
            <button className="botao py-2">Adicionar</button>
          </form>
        </section>

        <section>
          <h2 className="titulo text-2xl">Secretaria(o) da igreja</h2>
          <p className="text-sm text-tinta/60">Publica avisos e escalas no Mural. Não edita eventos nem vê dados de outros membros.</p>
          <form action={setSecretary} className="mt-3 flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <select name="user_id" defaultValue={secretary?.id ?? ""} className="campo py-2">
              <option value="">Ninguém</option>
              {profiles.filter((p) => p.role !== "admin").map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <button className="botao py-2">Salvar</button>
          </form>
        </section>

        <section>
          <h2 className="titulo text-2xl">Pessoas cadastradas ({profiles.length})</h2>
          <p className="text-sm text-tinta/60">Visível só para você. Use apenas para administrar a agenda.</p>
          <ul className="mt-3 divide-y divide-creme-escuro overflow-hidden rounded-2xl bg-white shadow-sm">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.full_name}</p>
                  <p className="truncate text-xs text-tinta/50">{p.email}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-aviva">
                  {[p.role === "admin" && "Admin", p.role === "secretaria" && "Secretaria", ministries.some((m) => m.leader_id === p.id) && "Líder"].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="titulo text-2xl">Histórico de alterações</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(logs ?? []).map((l) => (
              <li key={l.id} className="rounded-lg bg-white px-3 py-2">
                <span className="text-tinta/50">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · </span>
                <b>{nameOf.get(l.actor_id) ?? "Alguém"}</b> {ACOES[l.action] ?? l.action} {ENTIDADES[l.entity] ?? l.entity}
                {l.summary ? <> “{l.summary}”</> : null}
              </li>
            ))}
            {!logs?.length && <li className="text-tinta/50">Nenhuma alteração registrada ainda.</li>}
          </ul>
        </section>
      </main>
    </>
  );
}
