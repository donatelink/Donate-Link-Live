import Head from "next/head";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Baby,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  Globe,
  GraduationCap,
  HandHeart,
  Hash,
  Heart,
  Link2,
  Lock,
  Quote as QuoteIcon,
  Repeat,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Utensils,
} from "lucide-react";

/* ============================================================
   Landing — Version 4 · "Bento"
   Modern bento-grid landing with bold display type, dark hero,
   and a varied card grid mixing features, stats, and mock UI.
   Same DonateLink brand (emerald + amber, Plus Jakarta Sans).
   ============================================================ */

const STAGES = [
  { num: 1, Icon: Clock, title: "Pending" },
  { num: 2, Icon: CheckCircle2, title: "Confirmed" },
  { num: 3, Icon: FileText, title: "Allocated" },
  { num: 4, Icon: Send, title: "Transferred" },
  { num: 5, Icon: Award, title: "Completed" },
];

const ROLES = [
  { Icon: Heart, title: "Donors", body: "Find verified NGOs, donate, and follow your money to the family it helped." },
  { Icon: HandHeart, title: "Beneficiaries", body: "Submit a funding request — your story reaches a verified NGO within hours." },
  { Icon: Building2, title: "NGOs", body: "Apply, get verified, share proofs, and build a public reputation through reviews." },
];

const CAUSES = [
  { Icon: Utensils, name: "Food & Water", tag: "Sadaqah" },
  { Icon: Baby, name: "Orphan Care", tag: "Zakat" },
  { Icon: GraduationCap, name: "Education", tag: "Sadaqah" },
  { Icon: Stethoscope, name: "Medical Aid", tag: "Urgent" },
  { Icon: Droplets, name: "Clean Water", tag: "Global" },
  { Icon: Globe, name: "Disaster Relief", tag: "Global" },
];

function Logo({ dark = false }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          dark ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
        }`}
      >
        <Heart size={18} strokeWidth={2.5} className="fill-current" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-zinc-900"}`}>
        DonateLink
      </span>
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-emerald-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo dark />
        <div className="hidden items-center gap-7 md:flex">
          <a href="#features" className="text-sm font-semibold text-emerald-100/80 transition hover:text-white">
            Features
          </a>
          <a href="#how" className="text-sm font-semibold text-emerald-100/80 transition hover:text-white">
            How it works
          </a>
          <a href="#causes" className="text-sm font-semibold text-emerald-100/80 transition hover:text-white">
            Causes
          </a>
          <a href="#chain" className="text-sm font-semibold text-emerald-100/80 transition hover:text-white">
            On-chain
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-semibold text-emerald-100 transition hover:text-white">
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            Get Started <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-emerald-950">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
        <div className="mx-auto max-w-4xl text-center animate-page-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/50 px-4 py-1.5 text-xs font-semibold text-emerald-300">
            <Sparkles size={13} strokeWidth={2.5} /> Blockchain-verified · 5-stage lifecycle
          </span>
          <h1 className="mt-6 text-6xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-7xl lg:text-8xl">
            Donate.<br />
            <span className="text-emerald-400">Verify.</span>{" "}
            <span className="text-amber-400">Believe.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-emerald-100/70 sm:text-xl">
            The first donation platform where you can audit every dollar — from your hands to the
            family who needed it, anchored on-chain at every step.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              Start giving <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-7 py-3.5 text-base font-bold text-emerald-100 transition hover:border-emerald-500"
            >
              See the proof
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoGrid() {
  return (
    <section id="features" className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <ShieldCheck size={12} strokeWidth={2.5} /> Why DonateLink
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Everything you'd want in a charity — finally honest.
          </h2>
        </div>

        <div className="mt-14 grid auto-rows-fr gap-4 sm:grid-cols-6">
          {/* On-chain audit (big) */}
          <div className="card-hover sm:col-span-4 sm:row-span-2 rounded-3xl border border-zinc-200 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-8 text-white">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                <Link2 size={22} strokeWidth={2.2} />
              </span>
              <span className="rounded-full bg-emerald-700/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                Polygon · Verified
              </span>
            </div>
            <h3 className="mt-6 text-3xl font-extrabold leading-tight">Every step on the blockchain.</h3>
            <p className="mt-3 max-w-md text-emerald-100/80">
              Every stage transition writes a public transaction hash. Audit any donation, any time
              — in any block explorer, outside our platform.
            </p>

            <div className="mt-7 rounded-2xl border border-emerald-800 bg-emerald-900/40 p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-2 text-emerald-300">
                <span className="flex items-center gap-2">
                  <Hash size={12} strokeWidth={2.4} /> #4193 audit
                </span>
                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                  OK
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { s: "Pending", h: "0x9a4f…3b21" },
                  { s: "Confirmed", h: "0xb2c1…7d8e" },
                  { s: "Allocated", h: "0xfe71…0a99" },
                  { s: "Transferred", h: "0x3c08…ad22" },
                ].map((r) => (
                  <div key={r.s} className="flex items-center justify-between">
                    <span className="text-emerald-200">{r.s}</span>
                    <span className="text-emerald-400">{r.h}</span>
                    <CheckCircle2 size={12} strokeWidth={2.5} className="text-emerald-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat: total raised */}
          <div className="card-hover sm:col-span-2 rounded-3xl border border-zinc-200 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">This month</p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight text-zinc-900">$48,260</p>
            <p className="mt-1 text-sm text-zinc-600">raised across 12 verified causes</p>
            <div className="mt-4 flex -space-x-2">
              {[Utensils, Droplets, GraduationCap, Stethoscope].map((Ic, i) => (
                <span
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-white"
                >
                  <Ic size={14} strokeWidth={2.5} />
                </span>
              ))}
            </div>
          </div>

          {/* Ratings card */}
          <div className="card-hover sm:col-span-2 rounded-3xl border border-zinc-200 bg-amber-50 p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Star size={22} strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-amber-950">Ratings & reviews</h3>
            <p className="mt-2 text-sm text-amber-900/80">
              Only donors and beneficiaries who actually transacted can rate. Real signal, no fluff.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-amber-500">
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <span className="ml-2 text-xs font-bold text-amber-900">4.9 avg</span>
            </div>
          </div>

          {/* Proof at every step */}
          <div className="card-hover sm:col-span-3 rounded-3xl border border-zinc-200 bg-white p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Camera size={22} strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-zinc-900">Proof at every step.</h3>
            <p className="mt-2 text-sm text-zinc-600">
              NGOs upload a photo, receipt, or PDF at each of the 5 stages. Receipts, not promises.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">PNG</span>
              <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">JPG</span>
              <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">PDF</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                Verified <CheckCircle2 size={14} strokeWidth={2.5} />
              </span>
            </div>
          </div>

          {/* Shariah compliant */}
          <div className="card-hover sm:col-span-3 rounded-3xl border border-zinc-200 bg-white p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-zinc-900">Shariah compliant.</h3>
            <p className="mt-2 text-sm text-zinc-600">
              USDT stablecoin · no Gharar · AAOIFI 62 aligned. Built for Zakat, Sadaqah, and Waqf —
              and welcoming to every faith.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Lock size={13} strokeWidth={2.5} /> AAOIFI 62
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700">
            <Repeat size={12} strokeWidth={2.5} /> Lifecycle
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            5 stages. Fully verified.
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Every donation passes through 5 transparent stages on-chain, with proof at every step.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-100 md:block" />
          <div className="grid gap-6 md:grid-cols-5">
            {STAGES.map((s) => {
              const I = s.Icon;
              return (
                <div key={s.num} className="relative text-center">
                  <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white ring-8 ring-white">
                    <I size={20} strokeWidth={2.4} />
                  </span>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Stage {s.num}
                  </p>
                  <p className="mt-1 text-base font-bold text-zinc-900">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section className="bg-emerald-950">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            <Sparkles size={12} strokeWidth={2.5} /> Three sides · one ledger
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Built for everyone in the chain of giving.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((r) => {
            const I = r.Icon;
            return (
              <div
                key={r.title}
                className="card-hover rounded-3xl border border-emerald-800 bg-emerald-900/30 p-7 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                    <I size={22} strokeWidth={2.2} />
                  </span>
                  <ArrowUpRight size={20} strokeWidth={2.2} className="text-emerald-500" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-white">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">{r.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Causes() {
  return (
    <section id="causes" className="bg-amber-50/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-800">
              <Heart size={12} strokeWidth={2.5} /> Live causes
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-emerald-950 sm:text-5xl">
              Causes open right now
            </h2>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 underline-offset-4 hover:underline"
          >
            Browse all <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAUSES.map((c) => {
            const I = c.Icon;
            return (
              <Link
                key={c.name}
                href="/auth/register"
                className="card-hover group flex items-center justify-between rounded-2xl bg-white p-6 ring-1 ring-emerald-100"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <I size={22} strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="text-base font-extrabold text-emerald-950">{c.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                      {c.tag}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  strokeWidth={2.2}
                  className="text-zinc-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Quran() {
  return (
    <section className="bg-emerald-700">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <QuoteIcon size={32} strokeWidth={2.2} className="mx-auto text-emerald-300" />
        <p className="mt-5 text-2xl font-semibold leading-relaxed text-emerald-50 sm:text-3xl">
          The example of those who spend their wealth in the way of Allah is like a seed that
          grows seven spikes — in each spike a hundred grains.
        </p>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.25em] text-emerald-200">
          Quran 2:261
        </p>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-10 text-center sm:p-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Two minutes.<br />
            <span className="text-amber-300">Verified for life.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-emerald-100/80">
            Start your first donation. Watch it land. See the proof. Trust the rest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              Get started — free <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full border-2 border-emerald-600 px-8 py-4 text-base font-bold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-zinc-600">
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="#how" className="hover:text-zinc-900">How it works</a>
            <a href="#causes" className="hover:text-zinc-900">Causes</a>
            <Link href="/auth/login" className="hover:text-zinc-900">Sign in</Link>
          </div>
          <p className="text-sm text-zinc-500">Iqra University · FYP 2026</p>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          Built by Hasnain Sher Ayoub · Syed Saqlain · Usman Ali
        </p>
      </div>
    </footer>
  );
}

export default function LandingV4() {
  return (
    <>
      <Head>
        <title>DonateLink — Donate. Verify. Believe.</title>
        <meta
          name="description"
          content="The first donation platform where every dollar is audited on-chain. Donate, follow the proof, trust the impact."
        />
      </Head>
      <div className="min-h-screen bg-white text-zinc-900">
        <Navbar />
        <main>
          <Hero />
          <BentoGrid />
          <HowItWorks />
          <Roles />
          <Causes />
          <Quran />
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
