export function CvSkeleton({ label }: { label: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="mx-auto min-h-[297mm] w-full max-w-[210mm] animate-pulse bg-white p-7 shadow-2xl shadow-black/10 motion-reduce:animate-none sm:p-12 lg:p-16"
    >
      <span className="sr-only" role="status">
        {label}
      </span>
      <div aria-hidden="true">
        <div className="h-3 w-32 rounded-full bg-neutral-200" />
        <div className="mt-6 h-12 w-3/4 rounded-xl bg-neutral-200" />
        <div className="mt-4 h-5 w-48 rounded-full bg-neutral-200" />
        <div className="mt-10 h-px bg-neutral-300" />
        <div className="mt-10 space-y-3">
          <div className="h-3 w-40 rounded-full bg-neutral-200" />
          <div className="h-4 rounded-full bg-neutral-100" />
          <div className="h-4 rounded-full bg-neutral-100" />
          <div className="h-4 w-5/6 rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
