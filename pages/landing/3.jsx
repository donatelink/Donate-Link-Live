import Head from "next/head";
import Link from "next/link";

/* ============================================================
   Landing — Version 3 · "Kindred"
   Friendly, soft, community-first. Rounded shapes, amber +
   emerald, warm copy. The most approachable of the three.
   ============================================================ */

const STEPS = [
  { title: "You choose a cause", body: "Food, school fees, medical aid — pick what matters to you." },
  { title: "We move the money", body: "Every step is recorded so nothing gets lost on the way." },
  { title: "You get the proof", body: "Photos and a note from the family you helped. Promise." },
];

const CAUSES = [
  { name: "Food & Water", raised: "$3,600", pct: 72, accent: "emerald" },
  { name: "Orphan Care", raised: "$1,200", pct: 30, accent: "amber" },
  { name: "Education", raised: "$2,730", pct: 91, accent: "emerald" },
  { name: "Medical Aid", raised: "$9,000", pct: 45, accent: "amber" },
];

const VOICES = [
  { quote: "I finally know my Zakat actually arrived. The photo update made my week.", who: "Ayesha · donor" },
  { quote: "Setting up our NGO took an afternoon. Donors trust us more now.", who: "Hope Foundation" },
];

function Nav() {
  return (
    <header className="bg-amber-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="#top" className="flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          <span className="text-lg font-extrabold tracking-tight text-emerald-900">DonateLink</span>
        </Link>
        <div className="flex items-center gap-5">
          <a
            href="#top"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Home
          </a>
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-emerald-800 hover:text-emerald-900"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            Donate ♥
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-amber-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-10 lg:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            Kindness, kept track of
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-6xl">
            Give from the heart —
            <br />
            <span className="text-amber-600">we&apos;ll show you</span> where it lands.
          </h1>
          <p className="mt-5 max-w-md text-lg text-emerald-900/70">
            DonateLink is a warmer way to give. You donate, we carry it through every step, and you
            get real proof it reached someone who needed it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="rounded-full bg-emerald-600 px-7 py-3.5 text-base font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Start giving
            </Link>
            <a
              href="#steps"
              className="rounded-full border-2 border-emerald-200 bg-white px-7 py-3.5 text-base font-bold text-emerald-800 hover:border-emerald-300"
            >
              How it works
            </a>
          </div>
        </div>

        {/* soft card collage */}
        <div className="relative">
          <div className="rounded-3xl bg-emerald-600 p-7 text-white shadow-xl">
            <p className="text-sm font-semibold text-emerald-200">This month, together</p>
            <p className="mt-1 text-4xl font-extrabold">$48,260</p>
            <p className="mt-1 text-sm text-emerald-100">raised across 12 verified causes</p>
            <div className="mt-5 flex -space-x-2">
              {["🌷", "☀️", "🌿", "💧", "📚"].map((e, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg ring-2 ring-emerald-600"
                >
                  {e}
                </span>
              ))}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-900 ring-2 ring-emerald-600">
                +9
              </span>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 w-44 rotate-[-4deg] rounded-2xl bg-white p-4 shadow-lg ring-1 ring-amber-100">
            <p className="text-xs font-semibold text-emerald-700">✓ Proof received</p>
            <p className="mt-1 text-xs text-emerald-900/60">
              &ldquo;School supplies delivered to 14 kids.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section id="steps" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-emerald-950">
            Three steps. That&apos;s the whole thing.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-emerald-900/60">
            No jargon, no black box — just giving you can actually follow.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-3xl border border-emerald-100 bg-amber-50/60 p-7 text-center"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-emerald-950">{s.title}</h3>
              <p className="mt-2 text-sm text-emerald-900/70">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Causes() {
  return (
    <section className="bg-amber-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl font-extrabold tracking-tight text-emerald-950">
          Pick a cause to love today
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAUSES.map((c) => {
            const bar = c.accent === "amber" ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div
                key={c.name}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-emerald-950">{c.name}</h3>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-emerald-50">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-emerald-900/70">{c.raised} raised</span>
                  <Link
                    href="/auth/register"
                    className="font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    Give →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Voices() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {VOICES.map((v) => (
            <div
              key={v.who}
              className="rounded-3xl bg-emerald-600 p-8 text-white shadow-sm"
            >
              <p className="text-lg leading-relaxed">&ldquo;{v.quote}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-emerald-200">{v.who}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-amber-50">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-emerald-950">
          Ready to give the kind way?
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-emerald-900/60">
          It takes two minutes to make your first donation — and you&apos;ll see exactly where it
          goes.
        </p>
        <Link
          href="/auth/register"
          className="mt-7 inline-block rounded-full bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-md hover:bg-emerald-700"
        >
          Donate now ♥
        </Link>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="bg-emerald-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-center sm:flex-row sm:text-left">
        <span className="text-lg font-extrabold text-white">🤝 DonateLink</span>
        <p className="text-xs text-emerald-300">
          Iqra University · Final Year Project 2026 · Hasnain, Saqlain &amp; Usman
        </p>
      </div>
    </footer>
  );
}

export default function LandingV3() {
  return (
    <>
      <Head>
        <title>DonateLink — Kindness, kept track of</title>
        <meta
          name="description"
          content="A warmer way to give. Donate, follow every step, and get real proof your help arrived."
        />
      </Head>
      <div id="top" className="min-h-screen bg-amber-50 font-sans">
        <Nav />
        <main>
          <Hero />
          <Steps />
          <Causes />
          <Voices />
          <CTA />
        </main>
        <Foot />
      </div>
    </>
  );
}
