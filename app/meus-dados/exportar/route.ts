import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LGPD art. 18 — acesso e portabilidade: entrega ao titular tudo o que está guardado sobre ele
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const [{ data: perfil }, { data: perguntas }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, role, consent_at, consent_version, created_at, updated_at").eq("id", user.id).single(),
    supabase.from("questions").select("event_id, body, answer, created_at").eq("author_id", user.id),
  ]);

  const body = JSON.stringify(
    {
      gerado_em: new Date().toISOString(),
      controlador: "Comunidade Cristã Aviva",
      login: { email: user.email, provedor: user.app_metadata?.provider, criado_em: user.created_at, ultimo_acesso: user.last_sign_in_at },
      perfil,
      perguntas,
    },
    null,
    2,
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-aviva.json"',
      "Cache-Control": "no-store",
    },
  });
}
