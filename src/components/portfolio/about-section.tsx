export function AboutSection({
  copy,
  biography,
}: {
  copy: { number: string; title: string };
  biography: string;
}) {
  return (
    <section id="about" className="scroll-mt-16 border-b border-border">
      <div className="mx-auto grid w-full max-w-[96rem] gap-12 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[minmax(14rem,0.65fr)_minmax(0,1.35fr)] md:items-center lg:gap-20 lg:px-12">
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            /{copy.number}
          </span>
          <div className="mt-8 border-l-4 border-foreground pl-6">
            <h2 className="max-w-xs font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {copy.title}
            </h2>
          </div>
        </div>
        <div className="max-w-4xl space-y-6 text-lg leading-8 text-muted-foreground">
          {biography.split(/\n+/).map((paragraph, index) => (
            <p key={`biography-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
