import Head from "next/head";
import Link from "next/link";

/* ============================================================
   Landing — Version 2 · "On-Chain"
   Bold, dark, fintech / Web3 personality. High contrast,
   mono accents, a pipeline graphic. For the blockchain angle.
   ============================================================ */

const STATS = [
  { value: "5", label: "verified stages" },
  { value: "~$0.01", label: "avg. gas fee" },
  { value: "100%", label: "of it traceable" },
];

const PIPELINE = [
  { n: 1, name: "Pending", note: "donation initiated" },
  { n: 2, name: "Confirmed", note: "tx hash on-chain" },
  { n: 3, name: "Allocated", note: "assigned to NGO" },
  { n: 4, name: "Transferred", note: "funds sent out" },
  { n: 5, name: "Completed", note: "proof uploaded" },
];

const CAUSES = [
  { name: "Food & Water", pct: 72 },
  { name: "Orphan Education", pct: 91 },
  { name: "Medical Aid", pct: 45 },
  { name: "Disaster Relief", pct: 55 },
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="#top" className="flex items-center gap-2 text-white">
          <span className="text-lg font-bold tracking-tight">DonateLink</span>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
            chain
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <a href="#top" className="text-sm font-medium text-zinc-300 hover:text-white">
            Home
          </a>
          <Link href="/auth/login" className="text-sm font-medium text-zinc-300 hover:text-white">
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-zinc-950">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-600/20 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-emerald-400">
          [ block · verified · public ]
        </span>
        <h1 className="mx-auto mt-7 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
          Proof,
          <br />
          not <span className="text-emerald-400">promises.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          DonateLink writes every donation to the blockchain — so &ldquo;trust us&rdquo; becomes a
          transaction hash anyone can open and check.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="rounded-md bg-emerald-500 px-7 py-3.5 text-base font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Donate now
          </Link>
          <a
            href="#pipeline"
            className="rounded-md border border-white/15 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/5"
          >
            See the pipeline
          </a>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-zinc-950 px-4 py-6">
              <div className="text-3xl font-bold text-emerald-400">{s.value}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-wide text-zinc-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section id="pipeline" className="bg-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            &#47;&#47; lifecycle
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">
            One donation, five checkpoints.
          </h2>
          <p className="mt-3 text-zinc-400">
            A donation can&apos;t skip a stage. Each step is timestamped on-chain and an email is
            sent to the donor.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PIPELINE.map((p) => (
            <div
              key={p.n}
              className="rounded-lg border border-white/10 bg-zinc-950 p-5 transition hover:border-emerald-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500">stage</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">
                  {String(p.n).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{p.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Causes() {
  return (
    <section className="bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl font-bold tracking-tight text-white">Live causes</h2>
          <Link
            href="/auth/register"
            className="font-mono text-sm text-emerald-400 hover:text-emerald-300"
          >
            view all →
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAUSES.map((c) => (
            <div key={c.name} className="rounded-lg border border-white/10 bg-zinc-900 p-5">
              <h3 className="text-base font-semibold text-white">{c.name}</h3>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${c.pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500">{c.pct}% funded</span>
                <Link
                  href="/auth/register"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Fund
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Stop wondering where it went.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          Make your first transparent donation today — and watch it move.
        </p>
        <Link
          href="/auth/register"
          className="mt-8 inline-block rounded-md bg-emerald-500 px-8 py-3.5 text-base font-semibold text-zinc-950 hover:bg-emerald-400"
        >
          Create an account
        </Link>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <span className="font-bold text-white">DonateLink</span>
        <p className="font-mono text-xs text-zinc-500">
          Iqra University · FYP 2026 · Hasnain · Saqlain · Usman
        </p>
      </div>
    </footer>
  );
}

export default function LandingV2() {
  return (
    <>
      <Head>
        <title>DonateLink — Proof, not promises</title>
        <meta
          name="description"
          content="Blockchain donation platform. Every donation is a transaction hash you can verify."
        />
      </Head>
      <div id="top" className="min-h-screen bg-zinc-950 font-sans">
        <Nav />
        <main>
          <Hero />
          <Pipeline />
          <Causes />
          <CTA />
        </main>
        <Foot />
      </div>
    </>
  );
}
