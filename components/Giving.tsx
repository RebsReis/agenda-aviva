import CopyButton from "@/components/CopyButton";
import type { GivingInfo } from "@/lib/types";

/** Cartão de dízimos e ofertas (Pix) */
export default function Giving({ giving }: { giving: GivingInfo | null }) {
  if (!giving?.pix_key) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-tinta text-white shadow-sm">
      <div className="p-5">
        <p className="font-script text-2xl text-aviva-claro">dízimos e ofertas</p>
        {giving.message && <p className="mt-1 text-sm opacity-80">{giving.message}</p>}
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide opacity-60">Chave Pix{giving.pix_key_type ? ` (${giving.pix_key_type})` : ""}</dt>
            <dd className="break-all text-lg font-extrabold">{giving.pix_key}</dd>
          </div>
          {giving.beneficiary && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide opacity-60">Favorecido</dt>
              <dd className="font-semibold">{giving.beneficiary}{giving.bank ? ` · ${giving.bank}` : ""}</dd>
            </div>
          )}
          {giving.email && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide opacity-60">E-mail da igreja</dt>
              <dd className="break-all font-semibold">{giving.email}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4"><CopyButton text={giving.pix_key} /></div>
        <p className="mt-3 text-xs opacity-60">Confira sempre se o favorecido é a igreja antes de confirmar o Pix.</p>
      </div>
    </div>
  );
}
