import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import DonationModal from "@/components/DonationModal";
import StarRating from "@/components/StarRating";
import supabase from "@/utils/supabase";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

export default function NgoPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [ngo, setNgo] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [ngoRes, sessionRes] = await Promise.all([
        supabase
          .from("ngos")
          .select("*")
          .eq("slug", slug)
          .eq("status", "approved")
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      setNgo(ngoRes.data || null);
      setSignedIn(!!sessionRes.data.session);

      if (ngoRes.data?.id) {
        const { data: rData } = await supabase
          .from("ngo_ratings")
          .select("*")
          .eq("ngo_id", ngoRes.data.id)
          .order("created_at", { ascending: false });
        if (active) setRatings(rData || []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const ratingCount = ratings.length;
  const ratingAvg = ratingCount
    ? ratings.reduce((s, r) => s + r.stars, 0) / ratingCount
    : 0;

  function handleDonate() {
    if (signedIn) setModalOpen(true);
    else router.push("/auth/login");
  }

  return (
    <>
      <Head>
        <title>{ngo ? `${ngo.org_name} · DonateLink` : "NGO · DonateLink"}</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
          </div>
        </header>

        <DonationModal
          open={modalOpen}
          ngo={ngo}
          onClose={() => setModalOpen(false)}
        />

        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          {loading && <p className="text-sm text-zinc-500">Loading...</p>}

          {!loading && !ngo && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <div className="text-4xl">🔍</div>
              <h1 className="mt-3 text-lg font-bold text-zinc-900">NGO not found</h1>
              <p className="mt-1 text-sm text-zinc-600">
                This link is invalid, or the NGO has not been approved yet.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Back to home
              </Link>
            </div>
          )}

          {!loading && ngo && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    ✓ Verified by DonateLink
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {ngo.category}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <Avatar src={ngo.logo_url} name={ngo.org_name} size="xl" />
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{ngo.org_name}</h1>
                    <p className="mt-1 text-sm text-zinc-500">{ngo.country}</p>
                    <div className="mt-1">
                      <StarRating value={ratingAvg} size="md" count={ratingCount} showNumber={ratingCount > 0} />
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-zinc-700">{ngo.description}</p>

                <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">Contact Person</dt>
                    <dd className="mt-0.5 text-sm font-medium text-zinc-800">{ngo.contact_person}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">Email</dt>
                    <dd className="mt-0.5 text-sm font-medium text-zinc-800">{ngo.email}</dd>
                  </div>
                  {ngo.website && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">Website</dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        <a
                          href={ngo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          {ngo.website}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                <button
                  onClick={handleDonate}
                  className="mt-6 block w-full rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {signedIn ? `Donate to ${ngo.org_name}` : "Sign in to donate"}
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-zinc-400">
                Every donation to this NGO is tracked transparently through 5 stages.
              </p>

              {ratings.length > 0 && (
                <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Reviews ({ratings.length})
                  </h2>
                  <ul className="mt-4 divide-y divide-zinc-100">
                    {ratings.map((r) => (
                      <li key={r.id} className="py-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-zinc-900">
                            {r.reviewer_name || "Anonymous"}
                            {r.reviewer_role && (
                              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                                {r.reviewer_role}
                              </span>
                            )}
                          </div>
                          <StarRating value={r.stars} />
                        </div>
                        {r.review && (
                          <p className="mt-2 text-sm text-zinc-700">{r.review}</p>
                        )}
                        <p className="mt-1 text-xs text-zinc-400">{fmtDate(r.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
