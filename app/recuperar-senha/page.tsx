"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
    });
    // Mesma mensagem sempre, para não revelar quais e-mails têm conta
    setSent(true);
  }

  return (
    <AuthShell title="Nova senha">
      {sent ? (
        <p>Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-tinta/70">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
          <input className="campo" name="email" type="email" placeholder="Seu e-mail" required />
          <button className="botao w-full">Enviar link</button>
        </form>
      )}
      <Link href="/login" className="mt-5 block text-center text-sm text-tinta/60 underline">Voltar para o login</Link>
    </AuthShell>
  );
}
