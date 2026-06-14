import Head from "next/head";
import Link from "next/link";

/* ============================================================
   Landing — Version 1 · "The Ledger"
   Editorial / warm-trust layout. Serif headline, left-aligned
   hero, a donation-tracker card. Reads like a real charity site.
   ============================================================ */

const JOURNEY = [
  {
    step: "01",
    title: "You give",
    body: "Pick a cause and donate. The amount is logged the moment it leaves your hands — no waiting, no guessing.",
  },
  {
    step: "02",
    title: "It gets confirmed",
    body: "The donation is written to the blockchain. You get a transaction hash you can check yourself.",
  },
  {
    step: "03",
    title: "It gets allocated",
    body: "Our team assigns the funds to a verified NGO already working on the cause you picked.",
  },
  {
    step: "04",
    title: "It gets transferred",
    body: "Money reaches the people on the ground. An email lands in your inbox the day it happens.",
  },
  {
    step: "05",
    title: "You see the proof",
    body: "Photos, receipts and a short note from the field. The loop closes where most charities go quiet.",
  },
];

const CAUSES = [
  { name: "Food & clean water", raised: 3600, goal: 5000, tag: "Sadaqah" },
  { name: "School fees for orphans", raised: 2730, goal: 3000, tag: "Zakat" },
  { name: "Emergency medical aid", raised: 9000, goal: 20000, tag: "Urgent" },
  { name: "Disaster relief fund", raised: 22000, goal: 40000, tag: "Global" },
];

function Logo() {
  return (
    <Link href="#top" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
        D
      </span>
      <span className="text-lg font-semibold tracking-tight text-stone-900">DonateLink</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="border-b border-stone-200/80 bg-stone-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-6">
          <a
            href="#top"
            className="text-sm font-medium text-stone-700 underline-offset-4 hover:underline"
          >
            Home
          </a>
          <Link href="/auth/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Donate
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LedgerCard() {
  const rows = [
    { label: "Pending", done: true },
    { label: "Confirmed", done: true },
    { label: "Allocated", done: true },
    { label: "Transferred", done: false },
    { label: "Completed", done: false },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-widest text-stone-400">Donation #4193</p>
        <p className="text-sm font-semibold text-emerald-700">$120.00</p>
      </div>
      <p className="mt-1 text-sm text-stone-500">Food &amp; clean water · Karachi</p>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span
              className={
                r.done
                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] text-white"
                  : "flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-stone-300 text-[11px] text-stone-300"
              }
            >
              {r.done ? "✓" : ""}
            </span>
            <span className={r.done ? "text-sm text-stone-800" : "text-sm text-stone-400"}>
              {r.label}
            </span>
            {r.done && <span className="ml-auto text-xs text-stone-400">verified</span>}
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-400">
        Last update 2 hours ago · proof of impact pending
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-stone-50">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-700">
            Transparent giving · on the blockchain
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-stone-900 sm:text-6xl">
            Give once.
            <br />
            Follow it the
            <br />
            <span className="text-emerald-700">whole way home.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-600">
            Most donations vanish into a black box. DonateLink keeps the receipt — every stage,
            from your hands to the family who needed it, recorded and shown back to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-800"
            >
              Start a donation
            </Link>
            <a
              href="#journey"
              className="text-base font-semibold text-stone-700 underline-offset-4 hover:underline"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-stone-500">
            Built for Zakat, Sadaqah &amp; Waqf — and open to every faith and nation.
          </p>
        </div>
        <LedgerCard />
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section id="journey" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-4xl text-stone-900">Where your money goes</h2>
          <p className="mt-3 text-stone-600">
            Five stages. Each one logged on-chain, each one emailed to you. Nothing happens off the
            record.
          </p>
        </div>
        <div className="mt-12 border-t border-stone-200">
          {JOURNEY.map((j) => (
            <div
              key={j.step}
              className="grid gap-4 border-b border-stone-200 py-7 sm:grid-cols-[80px_220px_1fr]"
            >
              <span className="font-serif text-2xl text-emerald-700">{j.step}</span>
              <h3 className="text-lg font-semibold text-stone-900">{j.title}</h3>
              <p className="text-stone-600">{j.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CauseRow({ c }) {
  const pct = Math.round((c.raised / c.goal) * 100);
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          {c.tag}
        </span>
        <span className="text-sm text-stone-400">{pct}% funded</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-stone-900">{c.name}</h3>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-stone-500">
          ${c.raised.toLocaleString()} raised of ${c.goal.toLocaleString()}
        </span>
        <Link href="/auth/register" className="font-semibold text-emerald-700 hover:underline">
          Give →
        </Link>
      </div>
    </div>
  );
}

function Causes() {
  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-4xl text-stone-900">Causes open right now</h2>
          <Link href="/auth/register" className="text-sm font-semibold text-emerald-700 hover:underline">
            Browse all causes →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CAUSES.map((c) => (
            <CauseRow key={c.name} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Quote() {
  return (
    <section className="bg-emerald-800">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-serif text-2xl leading-relaxed text-emerald-50 sm:text-3xl">
          “The example of those who spend their wealth in the way of Allah is like a seed that
          grows seven spikes — in each spike a hundred grains.”
        </p>
        <p className="mt-5 text-sm uppercase tracking-widest text-emerald-300">Quran 2:261</p>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="bg-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold text-white">DonateLink</p>
            <p className="mt-1 text-sm text-stone-400">Transparent donations, recorded end to end.</p>
          </div>
          <Link
            href="/auth/register"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Donate now
          </Link>
        </div>
        <p className="mt-10 text-xs text-stone-500">
          Iqra University · Final Year Project · Batch 2026 — Hasnain Sher Ayoub, Syed Saqlain,
          Usman Ali
        </p>
      </div>
    </footer>
  );
}

export default function LandingV1() {
  return (
    <>
      <Head>
        <title>DonateLink — Follow your donation the whole way home</title>
        <meta
          name="description"
          content="A transparent blockchain donation platform. Track every donation across five verified stages."
        />
      </Head>
      <div id="top" className="min-h-screen bg-stone-50 font-sans text-stone-900">
        <Nav />
        <main>
          <Hero />
          <Journey />
          <Causes />
          <Quote />
        </main>
        <Foot />
      </div>
    </>
  );
}
