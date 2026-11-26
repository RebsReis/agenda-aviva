"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qr: string; secret: string };

/** Ativar / desativar a verificação em duas etapas (app autenticador) */
export default function TwoFactorSetup() {
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp?.[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setMsg("");
    // Remove tentativas anteriores não concluídas
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Agenda Aviva" });
    if (error || !data) return setMsg("Não foi possível iniciar. Tente novamente.");
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.factorId, code: code.trim() });
    if (error) return setMsg("Código incorreto. Confira o código atual no aplicativo.");
    setEnroll(null);
    setCode("");
    setMsg("Verificação em duas etapas ativada!");
    load();
  }

  async function disable() {
    if (!factorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return setMsg("Para desativar, saia e entre de novo usando o código do aplicativo.");
    await supabase.auth.refreshSession();
    setMsg("Verificação em duas etapas desativada.");
    load();
  }

  if (loading) return <p className="text-sm text-tinta/50">Carregando...</p>;

  if (factorId) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-800">✓ Ativada. Ao entrar, o app vai pedir o código do aplicativo autenticador.</p>
        {msg && <p className="text-sm">{msg}</p>}
        <button onClick={disable} className="text-sm font-semibold text-red-600 underline">Desativar</button>
      </div>
    );
  }

  if (enroll) {
    return (
      <form onSubmit={confirm} className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Instale um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou Authy).</li>
          <li>No aplicativo, toque em <b>adicionar</b> e escaneie o QR code abaixo.</li>
          <li>Digite o código de 6 números que aparecer.</li>
        </ol>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enroll.qr} alt="QR code para o aplicativo autenticador" className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
        <p className="text-center text-xs text-tinta/60">
          Não consegue escanear? Digite esta chave no aplicativo:<br />
          <code className="break-all font-bold">{enroll.secret}</code>
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Código de 6 números"
          className="campo text-center text-2xl tracking-[0.4em]"
          required
        />
        {msg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
        <button className="botao w-full" disabled={code.length !== 6}>Ativar</button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-sm">{msg}</p>}
      <button onClick={start} className="botao w-full">Ativar verificação em duas etapas</button>
    </div>
  );
}
