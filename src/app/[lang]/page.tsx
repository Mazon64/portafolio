export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 text-center">

        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          Ecosistema de Ingeniería
        </h1>

        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          David Yael Aranda Montes
        </p>

        <div className="mt-8 px-3 py-1 rounded bg-black/[.06] dark:bg-white/[.08] font-mono text-sm">
          Idioma activo: [{lang}]
        </div>

      </main>
    </div>
  );
}
