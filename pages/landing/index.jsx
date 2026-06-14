import Head from "next/head";
import Link from "next/link";

/* ============================================================
   /landing — design chooser. Pick one of the three landing
   page versions to view. (Internal compare page for the team.)
   ============================================================ */

const VERSIONS = [
  {
    href: "/landing/1",
    n: "01",
    name: "The Ledger",
    blurb:
      "Editorial, warm-trust layout. Serif headline, a live donation-tracker card, calm tone. Reads like an established charity.",
    swatch: ["bg-stone-100", "bg-emerald-700", "bg-amber-400"],
    style: "Calm · trustworthy",
  },
  {
    href: "/landing/2",
    n: "02",
    name: "On-Chain",
    blurb:
      "Bold and dark, fintech / Web3 personality. Mono accents, glow, a five-stage pipeline. Leans into the blockchain story.",
    swatch: ["bg-zinc-950", "bg-emerald-400", "bg-zinc-700"],
    style: "Modern · technical",
  },
  {
    href: "/landing/3",
    n: "03",
    name: "Kindred",
    blurb:
      "Friendly and soft, community-first. Rounded cards, amber + emerald, warm copy. The most approachable of the three.",
    swatch: ["bg-amber-50", "bg-emerald-600", "bg-amber-500"],
    style: "Warm · friendly",
  },
];

export default function LandingChooser() {
  return (
    <>
      <Head>
        <title>DonateLink — Landing page versions</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-700">
            DonateLink · Design review
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Three landing page versions</h1>
          <p className="mt-3 max-w-xl text-stone-600">
            Same content and brand colours — three different personalities. Open each one, then
            pick the design you want to ship as the home page.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VERSIONS.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-stone-400">{v.n}</span>
                  <div className="flex gap-1">
                    {v.swatch.map((c, i) => (
                      <span
                        key={i}
                        className={`h-5 w-5 rounded-full ring-1 ring-stone-200 ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <h2 className="mt-4 text-xl font-bold">{v.name}</h2>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {v.style}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{v.blurb}</p>
                <span className="mt-5 text-sm font-semibold text-emerald-700 group-hover:underline">
                  View version →
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-12 text-sm text-stone-500">
            Current live home page is still at{" "}
            <Link href="/" className="font-semibold text-emerald-700 hover:underline">
              /
            </Link>{" "}
            — untouched until you choose.
          </p>
        </div>
      </div>
    </>
  );
}
