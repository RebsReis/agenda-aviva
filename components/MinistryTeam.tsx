import { createClient } from "@/lib/supabase/server";
import { addMember, removeMember } from "@/app/equipe/actions";

/** Equipe do ministério (ex.: equipe da Mídia), gerenciada pelos líderes e pela admin */
export default async function MinistryTeam({
  ministryId,
  ministryName,
  message,
  ok,
}: {
  ministryId: string;
  ministryName: string;
  message?: string;
  ok?: boolean;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ministry_members")
    .select("user_id, member_name")
    .eq("ministry_id", ministryId)
    .order("member_name");
  const members = (data ?? []) as { user_id: string; member_name: string | null }[];
  const da = ministryName === "Mídia" ? "da" : "do";

  return (
    <section id="equipe" className="mb-8 scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-extrabold">Equipe {da} {ministryName} ({members.length})</h2>
      <p className="text-sm text-tinta/60">Quem está na equipe pode adicionar, editar e apagar avisos gerais.</p>

      {message && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message}</p>
      )}

      <ul className="mt-3 flex flex-wrap gap-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2 rounded-full bg-creme py-1 pl-3 pr-1 text-sm font-semibold">
            {m.member_name}
            <form action={removeMember.bind(null, ministryId, m.user_id)}>
              <button className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs text-red-600" aria-label={`Remover ${m.member_name}`}>✕</button>
            </form>
          </li>
        ))}
        {!members.length && <li className="text-sm text-tinta/50">Ninguém na equipe ainda.</li>}
      </ul>

      <form action={addMember.bind(null, ministryId)} className="mt-3 flex gap-2">
        <input name="email" type="email" className="campo py-2" placeholder="E-mail de cadastro da pessoa" required />
        <button className="botao py-2">Adicionar</button>
      </form>
      <p className="mt-2 text-xs text-tinta/50">A pessoa precisa ter conta no app. Use o mesmo e-mail com que ela se cadastrou.</p>
    </section>
  );
}
