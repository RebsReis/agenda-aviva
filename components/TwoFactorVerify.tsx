"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Pede o código do app autenticador e eleva a sessão para "duas etapas" (aal2) */
export default function TwoFactorVerify({ next = "/", compact = false }: { next?: string; compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.[0];
    if (!factor) {
      setLoading(false);
      return setError("Nenhum autenticador ativado nesta conta.");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setLoading(false);
    if (error) return setError("Código incorreto ou expirado. Tente o código atual.");
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!compact && <p className="text-sm text-tinta/70">Abra o aplicativo autenticador e digite o código de 6 números da Agenda Aviva.</p>}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        className="campo text-center text-2xl tracking-[0.4em]"
        autoFocus={!compact}
        required
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="botao w-full" disabled={loading || code.length !== 6}>{loading ? "Verificando..." : "Confirmar código"}</button>
    </form>
  );
}
