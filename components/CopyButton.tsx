"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copiar chave Pix", dark = false }: { text: string; label?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão para copiar: a chave continua visível para copiar manualmente
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`w-full rounded-xl px-5 py-3 font-bold transition active:scale-[0.98] ${dark ? "bg-white text-tinta" : "bg-aviva text-white"}`}
    >
      {copied ? "✓ Copiada!" : label}
    </button>
  );
}
