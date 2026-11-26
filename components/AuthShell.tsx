import Image from "next/image";

export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh">
      <div className="meio-tom bg-aviva px-6 pb-16 pt-12 text-white">
        <div className="mx-auto max-w-md">
          <Image src="/logo-aviva-branco.png" alt="Comunidade Cristã Aviva" width={260} height={44} priority />
          <p className="mt-6 font-script text-3xl">nossa agenda,</p>
          <h1 className="titulo text-5xl">{title}</h1>
        </div>
      </div>
      <div className="mx-auto -mt-10 max-w-md px-4 pb-12">
        <div className="rounded-2xl bg-white p-6 shadow-xl">{children}</div>
      </div>
    </main>
  );
}
