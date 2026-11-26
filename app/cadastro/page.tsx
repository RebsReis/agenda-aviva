"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import { createClient } from "@/lib/supabase/client";
import { CONSENT_VERSION } from "@/lib/types";

export default function CadastroPage() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(form.get("password2"))) return setError("As senhas não conferem.");
    if (!form.get("consent")) return setError("Para criar a conta, aceite a Política de Privacidade.");

    setLoading(true);
    const { error } = await createClient().auth.signUp({
      email: String(form.get("email")).trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: String(form.get("name")).trim(), consent_version: CONSENT_VERSION },
      },
    });
    setLoading(false);
    if (error) return setError(error.message.includes("Password") ? "Escolha uma senha mais forte." : "Não foi possível criar a conta. Tente novamente.");
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Quase lá!">
        <p className="text-lg">Enviamos um link de confirmação para o seu e-mail.</p>
        <p className="mt-2 text-tinta/70">Abra o e-mail e toque no link para ativar sua conta.</p>
        <Link href="/login" className="botao mt-6 w-full">Voltar para o login</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar conta">
      <GoogleButton label="Continuar com Google" />
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-tinta/40">
        <span className="h-px flex-1 bg-creme-escuro" /> ou com e-mail <span className="h-px flex-1 bg-creme-escuro" />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="campo" name="name" placeholder="Nome completo" autoComplete="name" minLength={2} maxLength={120} required />
        <input className="campo" name="email" type="email" placeholder="E-mail" autoComplete="email" required />
        <input className="campo" name="password" type="password" placeholder="Senha (mín. 8 caracteres)" autoComplete="new-password" required />
        <input className="campo" name="password2" type="password" placeholder="Repita a senha" autoComplete="new-password" required />

        <label className="flex items-start gap-3 rounded-xl bg-creme p-3 text-sm">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5 accent-aviva" />
          <span>
            Li e aceito a <Link href="/privacidade" target="_blank" className="font-bold text-aviva underline">Política de Privacidade</Link>.
            Entendo que meu nome aparecerá para os membros quando eu fizer perguntas nos eventos, e que posso excluir minha conta a qualquer momento.
            Declaro ter 18 anos ou mais.
          </span>
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="botao w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
      </form>
      <p className="mt-5 text-center text-sm">
        Já tem conta? <Link href="/login" className="font-bold text-aviva">Entrar</Link>
      </p>
    </AuthShell>
  );
}
