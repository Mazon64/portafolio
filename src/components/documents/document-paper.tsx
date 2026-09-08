import { cn } from "@/lib/utils";

export function DocumentPaper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-7 text-neutral-950 shadow-2xl shadow-black/10 sm:p-12 lg:p-16",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function DocumentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="document-section">
      <h2 className="document-section-title border-b border-neutral-400 pb-2 font-mono text-[0.68rem] font-semibold tracking-[0.16em] text-neutral-700 uppercase">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
