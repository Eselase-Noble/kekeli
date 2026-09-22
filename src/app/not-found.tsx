import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bark text-2xl text-brand-400 shadow-sm">
          ⚡
        </span>

        <p className="mt-8 font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-brand-700">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          This page went dark
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          There&apos;s nothing wired up at this address. It may have moved, or the
          link was mistyped.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to overview
          </Link>
          <Link href="/balance" className="btn-ghost">
            Check balance
          </Link>
        </div>
      </div>
    </main>
  );
}
