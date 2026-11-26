"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("erro") === "link" ? "Link inválido ou expirado. Tente novamente." : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Email not confirmed")
          ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
          : "E-mail ou senha incorretos.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthShell title="Entrar">
      <GoogleButton />
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-tinta/40">
        <span className="h-px flex-1 bg-creme-escuro" /> ou com e-mail <span className="h-px flex-1 bg-creme-escuro" />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="campo" name="email" type="email" placeholder="Seu e-mail" autoComplete="email" required />
        <input className="campo" name="password" type="password" placeholder="Senha" autoComplete="current-password" required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="botao w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-tinta/60 underline">Esqueci minha senha</Link>
        <p>
          Ainda não tem conta? <Link href="/cadastro" className="font-bold text-aviva">Criar conta</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
