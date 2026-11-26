import Link from "next/link";
import Image from "next/image";
import type { Session } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

export default function Header({ session }: { session: Session }) {
  const firstName = session.profile.full_name.split(" ")[0];
  return (
    <header className="meio-tom sticky top-0 z-20 bg-aviva text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="Início">
          <Image src="/logo-aviva-branco.png" alt="Comunidade Cristã Aviva" width={150} height={26} priority />
        </Link>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-extrabold text-aviva">
              {firstName[0]?.toUpperCase()}
            </span>
            {firstName}
          </summary>
          <nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white text-tinta shadow-xl">
            <div className="border-b border-creme-escuro px-4 py-2 text-xs text-tinta/60">
              {session.isAdmin
                ? "Administradora geral"
                : [session.isSecretary && "Secretaria da igreja", session.ledMinistries.length && "Líder de ministério"].filter(Boolean).join(" · ") || "Membro"}
            </div>
            <Link className="block px-4 py-3 hover:bg-creme" href="/">Agenda</Link>
            <Link className="block px-4 py-3 hover:bg-creme" href="/mural">Mural da igreja</Link>
            {session.canEdit && <Link className="block px-4 py-3 hover:bg-creme" href="/eventos/novo">Novo evento</Link>}
            {session.isAdmin && <Link className="block px-4 py-3 hover:bg-creme" href="/admin">Painel do admin</Link>}
            <Link className="block px-4 py-3 hover:bg-creme" href="/meus-dados">Meus dados</Link>
            <Link className="block px-4 py-3 hover:bg-creme" href="/seguranca">Segurança</Link>
            <Link className="block px-4 py-3 hover:bg-creme" href="/privacidade">Privacidade</Link>
            <form action={signOut}>
              <button className="block w-full px-4 py-3 text-left font-semibold text-aviva hover:bg-creme">Sair</button>
            </form>
          </nav>
        </details>
      </div>
    </header>
  );
}
