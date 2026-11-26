"use client";

import { useState } from "react";
import type { GivingInfo } from "@/lib/types";

const TYPES = ["CNPJ", "E-mail", "Telefone", "Aleatória"];

/** Formulário do Pix com revisão: mostra antes/depois e exige a chave nova digitada duas vezes */
export default function PixForm({ giving, action }: { giving: GivingInfo; action: (formData: FormData) => void | Promise<void> }) {
  const [key, setKey] = useState(giving.pix_key ?? "");
  const [confirm, setConfirm] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const changed = key.trim() !== (giving.pix_key ?? "");
  const confirmOk = !changed || confirm.trim() === key.trim();

  return (
    <form action={action} className="mt-3 space-y-3" onChange={() => setReviewing(false)}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="pix_key" value={key} onChange={(e) => setKey(e.target.value)} className="campo" placeholder="Chave Pix" maxLength={120} />
        <select name="pix_key_type" defaultValue={giving.pix_key_type ?? "CNPJ"} className="campo">
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {changed && (
        <input
          name="pix_key_confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          className={`campo ${confirm && !confirmOk ? "border-red-400" : ""}`}
          placeholder="Digite a chave nova de novo"
          autoComplete="off"
          maxLength={120}
        />
      )}
      <input name="beneficiary" defaultValue={giving.beneficiary ?? ""} className="campo" placeholder="Favorecido (ex.: Comunidade Cristã Aviva)" maxLength={120} />
      <input name="bank" defaultValue={giving.bank ?? ""} className="campo" placeholder="Banco (opcional)" maxLength={80} />
      <input name="email" type="email" defaultValue={giving.email ?? ""} className="campo" placeholder="E-mail da igreja" maxLength={120} />
      <textarea name="message" defaultValue={giving.message ?? ""} className="campo min-h-20" placeholder="Mensagem (opcional)" maxLength={500} />

      {reviewing && changed && (
        <div className="rounded-xl border-2 border-aviva bg-creme p-4 text-sm">
          <p className="font-extrabold text-aviva">Confira a troca da chave Pix</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase text-tinta/50">Antes</p>
              <p className="break-all font-semibold line-through opacity-60">{giving.pix_key || "(vazia)"}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase text-tinta/50">Depois</p>
              <p className="break-all font-extrabold">{key}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-tinta/60">Só a admin, com verificação em duas etapas, pode alterar estes dados. Toda alteração fica no histórico.</p>

      {changed && !reviewing ? (
        <button type="button" className="botao w-full" disabled={!key.trim() || !confirmOk || !confirm} onClick={() => setReviewing(true)}>
          {confirm && !confirmOk ? "As chaves não conferem" : "Revisar alteração"}
        </button>
      ) : (
        <button className="botao w-full">{changed ? "Confirmar e salvar" : "Salvar dados do Pix"}</button>
      )}
    </form>
  );
}
