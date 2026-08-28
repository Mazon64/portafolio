import type { ReactNode } from "react";

type PortfolioSectionProps = {
  id: string;
  copy: {
    number: string;
    title: string;
  };
  children: ReactNode;
  className?: string;
};

export function PortfolioSection({
  id,
  copy,
  children,
  className = "",
}: PortfolioSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 border-b border-border ${className}`}
    >
      <div className="mx-auto w-full max-w-[96rem] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-5 md:grid-cols-[minmax(5rem,0.18fr)_minmax(0,1.82fr)] md:gap-8">
          <span className="font-mono text-xs text-muted-foreground">
            /{copy.number}
          </span>
          <div>
            <h2 className="max-w-3xl font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {copy.title}
            </h2>
          </div>
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
