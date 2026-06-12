function SkeletonCard() {
  return (
    <div className="h-36 animate-pulse rounded-[28px] border border-white/60 bg-white/70 shadow-[var(--shadow)]" />
  );
}

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[var(--shadow)]">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded-full bg-slate-200" />
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-96 animate-pulse rounded-[28px] border border-white/60 bg-white/70 shadow-[var(--shadow)]" />
        <div className="h-96 animate-pulse rounded-[28px] border border-white/60 bg-white/70 shadow-[var(--shadow)]" />
      </section>
    </main>
  );
}
