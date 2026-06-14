import Head from "next/head";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Baby,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Droplets,
  FileText,
  Globe,
  GraduationCap,
  HandHeart,
  Heart,
  Link2,
  Quote as QuoteIcon,
  Repeat,
  Send,
  Siren,
  Sparkles,
  Star,
  Stethoscope,
  Utensils,
} from "lucide-react";

const STAGES = [
  { num: 1, Icon: Clock, title: "Pending", desc: "Donation initiated by the donor" },
  { num: 2, Icon: CheckCircle2, title: "Confirmed", desc: "NGO confirms receipt — anchored on-chain" },
  { num: 3, Icon: FileText, title: "Allocated", desc: "Funds assigned to a verified cause" },
  { num: 4, Icon: Send, title: "Transferred", desc: "Money reaches the beneficiary" },
  { num: 5, Icon: Award, title: "Completed", desc: "Proof of impact uploaded" },
];

const ROLES = [
  {
    Icon: Heart,
    title: "Donors",
    points: [
      "Browse verified NGOs with logos, ratings & reviews",
      "Pay via Stripe (card) or MetaMask (Polygon / Ethereum)",
      "Track every donation across all 5 stages with proof",
      "Rate the NGOs you've supported and share reviews",
    ],
  },
  {
    Icon: HandHeart,
    title: "Beneficiaries",
    points: [
      "Sign up free, browse NGOs by category and rating",
      "Submit one funding request per month with your story",
      "NGO verifies your request and contacts you directly",
      "Follow your payout through the same 5-stage lifecycle",
    ],
  },
  {
    Icon: Building2,
    title: "NGOs",
    points: [
      "Apply with your registration — verified by our admin",
      "Get a public donation page with your branded logo",
      "Advance each donation stage and upload proof",
      "Review beneficiary requests and disburse funds",
    ],
  },
];

const FEATURES = [
  {
    Icon: Link2,
    title: "Blockchain transparency",
    body: "Every donation stage is securely recorded on the Polygon and Ethereum blockchain networks, allowing donors to verify the complete transaction journey from donor to beneficiary.",
  },
  {
    Icon: Camera,
    title: "Proof at every step",
    body: "NGO upload photo as a proof after transferring the received funds, beneficiary receive their payment and donor updated with completed status.",
  },
  {
    Icon: Star,
    title: "Ratings & reviews",
    body: "Only people who've actually transacted can rate. Top-rated organizations earn a verified badge across the platform.",
  },
  {
    Icon: Globe,
    title: "Open to all",
    body: "Support any cause you care about: Hunger & Food Crisis, Clean Water Access, Children Education, Medical & Healthcare, Disaster Relief, Orphan Care, Elderly Care, and more.",
  },
];

const CAUSES = [
  { name: "Hunger & Food Crisis", raised: "$3,600", pct: 72, accent: "emerald", Icon: Utensils },
  { name: "Clean Water Access", raised: "$2,150", pct: 54, accent: "amber", Icon: Droplets },
  { name: "Children Education", raised: "$2,730", pct: 91, accent: "emerald", Icon: GraduationCap },
  { name: "Medical & Healthcare", raised: "$9,000", pct: 45, accent: "amber", Icon: Stethoscope },
  { name: "Disaster Relief", raised: "$5,400", pct: 63, accent: "emerald", Icon: Siren },
  { name: "Orphan Care", raised: "$1,200", pct: 30, accent: "amber", Icon: Baby },
  { name: "Elderly Care", raised: "$1,850", pct: 48, accent: "emerald", Icon: HandHeart },
  { name: "Others", raised: "$980", pct: 22, accent: "amber", Icon: Globe },
];

const VOICES = [
  {
    quote: "I funded a clean water well and followed every stage. The completion photo of families using it made my week.",
    who: "Ayesha",
    role: "Donor",
  },
  {
    quote: "We run hunger, medical and orphan-care causes here. Donors trust us more once they see each proof go live.",
    who: "Hope Foundation",
    role: "NGO",
  },
  {
    quote: "I needed urgent medical care and didn't know where to ask. The NGO verified my request and covered the treatment within days.",
    who: "Khalid",
    role: "Beneficiary",
  },
];

const TRUST = [
  { Icon: Repeat, value: "5-Stage", label: "Verified Lifecycle" },
  { Icon: Link2, value: "On-Chain", label: "Polygon and Ethereum Blockchain" },
  { Icon: Globe, value: "All Faiths", label: "Open Platform" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <img
        src="/donatelink-logo.png"
        alt="DonateLink"
        className="h-[46px] w-auto"
      />
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how" className="text-sm font-semibold text-zinc-600 transition hover:text-zinc-900">
            How it works
          </a>
          <a href="#features" className="text-sm font-semibold text-zinc-600 transition hover:text-zinc-900">
            Features
          </a>
          <a href="#causes" className="text-sm font-semibold text-zinc-600 transition hover:text-zinc-900">
            Causes
          </a>
          <a href="#chain" className="text-sm font-semibold text-zinc-600 transition hover:text-zinc-900">
            On-chain
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-zinc-700 transition hover:text-zinc-900"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Get Started
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/40 via-white to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2 lg:pb-32 lg:pt-24">
        <div className="animate-page-in">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
            Give once.
            <br />
            Follow it the
            <br />
            <span className="text-emerald-600">whole way home.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-600">
            Most donations vanish into a black box. DonateLink keeps the receipt — every stage,
            from your hands to the family who needed it, recorded on-chain and shown back to you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              Start giving <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-white px-7 py-3.5 text-base font-bold text-emerald-800 transition hover:border-emerald-300"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="relative animate-page-in">
          <div className="rounded-3xl bg-emerald-600 p-7 text-white shadow-2xl">
            <p className="text-sm font-semibold text-emerald-200">This month, together</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight">$48,260</p>
            <p className="mt-1 text-sm text-emerald-100">raised across 12 verified causes</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[Utensils, Droplets, GraduationCap, Stethoscope, Baby].map((Ic, i) => (
                  <span
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 ring-2 ring-emerald-600"
                  >
                    <Ic size={16} strokeWidth={2.5} />
                  </span>
                ))}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-900 ring-2 ring-emerald-600">
                  +9
                </span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-4 w-56 rotate-[-4deg] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-amber-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={14} strokeWidth={2.5} /> Proof received
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              "School supplies delivered to 14 kids."
            </p>
          </div>

          <div className="absolute -right-3 -top-3 w-48 rotate-[4deg] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-emerald-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Donation #4193
            </p>
            <p className="mt-1 text-lg font-bold text-zinc-900">$120.00</p>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Send size={12} strokeWidth={2.5} /> Stage 4 · Transferred
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-3">
        {TRUST.map(({ Icon, value, label }) => (
          <div key={label} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="text-base font-extrabold leading-tight text-zinc-900">{value}</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <Repeat size={12} strokeWidth={2.5} /> Lifecycle
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          5 Stages. Fully Verified.
        </h2>
        <p className="mt-4 text-lg text-zinc-600">
          Every donation passes through 5 transparent stages on-chain — with proof at every step.
        </p>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-5">
        {STAGES.map((s) => {
          const I = s.Icon;
          return (
            <div
              key={s.num}
              className="card-hover relative rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <span className="absolute right-4 top-4 text-xs font-bold text-zinc-300">
                {String(s.num).padStart(2, "0")}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <I size={20} strokeWidth={2.2} />
              </span>
              <h3 className="mt-4 text-base font-bold text-zinc-900">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700">
            <Sparkles size={12} strokeWidth={2.5} /> One platform · three sides
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Built for everyone in the chain of giving
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Donors give, beneficiaries request, NGOs run the work. Everyone sees the same proof.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((r) => {
            const I = r.Icon;
            return (
              <div
                key={r.title}
                className="card-hover rounded-3xl border border-zinc-200 bg-white p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <I size={22} strokeWidth={2.2} />
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-zinc-900">{r.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-zinc-600">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckCircle2 size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          Why we&apos;re different
        </h2>
        <p className="mt-4 text-lg text-zinc-600">
          Built on blockchain, verified by proof, open to everyone.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const I = f.Icon;
          return (
            <div key={f.title} className="card-hover rounded-3xl border border-zinc-200 bg-white p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <I size={22} strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-zinc-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Blockchain() {
  return (
    <section id="chain" className="bg-emerald-950">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-900/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
          <Link2 size={13} strokeWidth={2.5} /> On-chain transparency
        </span>
        <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          Every donation, <span className="text-amber-400">verifiable</span> end to end.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-emerald-100/80">
          Two independent layers: a familiar card payment, and an on-chain record anyone can verify.
        </p>

        <div className="mt-12 grid gap-5 text-left sm:grid-cols-2">
          <div className="rounded-3xl border border-emerald-800 bg-emerald-900/30 p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-emerald-300 ring-1 ring-emerald-700">
              <CreditCard size={22} strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-white">Card payments — Stripe</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">
              Donations are paid securely by card through Stripe — a fast, familiar checkout. No
              crypto wallet required to give.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-800 bg-emerald-900/30 p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-emerald-300 ring-1 ring-emerald-700">
              <Link2 size={22} strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-white">Blockchain transparency</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">
              Separately, every donation stage is recorded on the Polygon and Ethereum blockchain
              networks — verifiable by anyone on a public block explorer.
            </p>
          </div>
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
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-4xl">
              Causes open right now
            </h2>
          </div>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAUSES.map((c) => {
            const I = c.Icon;
            const bar = c.accent === "amber" ? "bg-amber-500" : "bg-emerald-500";
            const iconBg = c.accent === "amber" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
            return (
              <div
                key={c.name}
                className="card-hover rounded-3xl bg-white p-6 ring-1 ring-emerald-100"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
                  <I size={20} strokeWidth={2.2} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-emerald-950">{c.name}</h3>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-emerald-900/70">{c.raised} raised</span>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-0.5 font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    Give <ChevronRight size={14} strokeWidth={2.5} />
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
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Real people, real proof
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {VOICES.map((v) => (
            <div
              key={v.who}
              className="card-hover rounded-3xl bg-emerald-600 p-7 text-white shadow-sm"
            >
              <QuoteIcon size={28} strokeWidth={2.2} className="text-emerald-300" />
              <p className="mt-3 text-base leading-relaxed">{v.quote}</p>
              <div className="mt-5 flex items-center justify-between text-sm font-semibold text-emerald-200">
                <span>{v.who}</span>
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] uppercase tracking-widest">
                  {v.role}
                </span>
              </div>
            </div>
          ))}
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
    <section className="bg-amber-50">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-emerald-950 sm:text-5xl">
          Ready to give — the transparent way?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-emerald-900/70">
          Two minutes to your first donation. Watch it land. See the proof. Trust the rest.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            Get started — it's free <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/login"
            className="rounded-full border-2 border-emerald-200 bg-white px-8 py-4 text-base font-bold text-emerald-800 transition hover:border-emerald-300"
          >
            I already have an account
          </Link>
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
            <a href="#how" className="hover:text-zinc-900">How it works</a>
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="#chain" className="hover:text-zinc-900">On-chain</a>
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

export default function Home() {
  return (
    <>
      <Head>
        <title>DonateLink — Transparent Donations, On the Blockchain</title>
        <meta
          name="description"
          content="A transparent donation platform built on blockchain. Track every donation across 5 verified stages with proof. Open to all faiths and nations."
        />
      </Head>
      <div className="min-h-screen bg-white text-zinc-900">
        <Navbar />
        <main>
          <Hero />
          <TrustStrip />
          <HowItWorks />
          <Roles />
          <Features />
          <Blockchain />
          <Causes />
          <Voices />
          <Quran />
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
