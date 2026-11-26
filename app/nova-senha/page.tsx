"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(form.get("password2"))) return setError("As senhas não conferem.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setError("Não foi possível alterar a senha. Peça um novo link.");
    router.replace("/");
  }

  return (
    <AuthShell title="Nova senha">
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="campo" name="password" type="password" placeholder="Nova senha" autoComplete="new-password" required />
        <input className="campo" name="password2" type="password" placeholder="Repita a nova senha" autoComplete="new-password" required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="botao w-full">Salvar senha</button>
      </form>
    </AuthShell>
  );
}
