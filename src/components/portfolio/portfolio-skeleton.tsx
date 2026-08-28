export function PortfolioSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <section className="border-b border-border">
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[96rem] flex-col justify-end px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <span className="sr-only" role="status">
            {label}
          </span>
          <div aria-hidden="true" className="space-y-7">
            <div className="h-3 w-48 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            <div className="h-16 max-w-4xl animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:h-24" />
            <div className="h-7 w-64 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[96rem] px-5 py-20 sm:px-8 lg:px-12">
        <div aria-hidden="true" className="grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-96 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
