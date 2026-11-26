"use client";

import { useEffect, useRef } from "react";

const KEY = "aviva-filtros-scroll";

/**
 * Fileira de filtros com rolagem lateral que acompanha o filtro escolhido:
 * ao trocar de ministério, desliza até deixar o botão ativo visível (centralizado).
 */
export default function ChipRow({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    // Começa de onde a fileira estava antes de trocar de página, para o movimento ficar suave
    try {
      const prev = Number(sessionStorage.getItem(KEY));
      if (!Number.isNaN(prev)) row.scrollLeft = prev;
    } catch {}

    const active = row.querySelector<HTMLElement>('[aria-current="true"]');
    if (!active) return;
    const target = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });

    const save = () => {
      try {
        sessionStorage.setItem(KEY, String(row.scrollLeft));
      } catch {}
    };
    row.addEventListener("scroll", save, { passive: true });
    return () => row.removeEventListener("scroll", save);
  }, [activeKey]);

  return (
    <div ref={ref} className="relative -mx-4 mt-3 flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 text-xs font-bold [scrollbar-width:none]">
      {children}
    </div>
  );
}
