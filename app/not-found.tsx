import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-script text-3xl text-aviva">ops!</p>
        <h1 className="titulo text-5xl">Página não encontrada</h1>
        <Link href="/" className="botao mt-6">Voltar para a agenda</Link>
      </div>
    </main>
  );
}
