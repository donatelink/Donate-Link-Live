import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import DonationModal from "@/components/DonationModal";
import RatingModal from "@/components/RatingModal";
import ReviewsModal from "@/components/ReviewsModal";
import StarRating from "@/components/StarRating";
import supabase from "@/utils/supabase";

const STAGES = ["Pending", "Confirmed", "Allocated", "Transferred", "Completed"];

function StageTracker({ stage }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STAGES.map((label, i) => {
        const reached = i < stage;
        const current = i === stage - 1;
        return (
          <div
            key={label}
            title={label}
            className={`h-2 w-5 rounded-full sm:w-6 ${
              current ? "bg-emerald-500" : reached ? "bg-emerald-300" : "bg-zinc-200"
            }`}
          />
        );
      })}
      <span className="ml-2 text-xs font-semibold text-zinc-600">{STAGES[stage - 1]}</span>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function DonorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ngos, setNgos] = useState([]);
  const [donations, setDonations] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [modalNgo, setModalNgo] = useState(null);
  const [ratingNgo, setRatingNgo] = useState(null);
  const [reviewsNgo, setReviewsNgo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      const [ngoRes, donRes, ratingRes, userRes] = await Promise.all([
        supabase.from("ngos").select("*").eq("status", "approved").order("org_name"),
        supabase
          .from("donations")
          .select("*")
          .eq("donor_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("ngo_ratings").select("*"),
        supabase.from("users").select("name").eq("id", session.user.id).single(),
      ]);
      if (!active) return;
      if (ngoRes.error) setErrorMsg(ngoRes.error.message);
      if (donRes.error) setErrorMsg(donRes.error.message);
      setUserId(session.user.id);
      setName(userRes.data?.name || "");
      setNgos(ngoRes.data || []);
      setDonations(donRes.data || []);
      setRatings(ratingRes.data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function reloadRatings() {
    const { data } = await supabase.from("ngo_ratings").select("*");
    setRatings(data || []);
  }

  async function reloadDonations() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("donations")
      .select("*")
      .eq("donor_id", session.user.id)
      .order("created_at", { ascending: false });
    setDonations(data || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const completed = donations.filter((d) => d.stage === 5).length;

  // Build per-NGO rating stats and user's own rating
  const statsByNgo = {};
  for (const r of ratings) {
    if (!statsByNgo[r.ngo_id]) statsByNgo[r.ngo_id] = { sum: 0, count: 0, mine: null };
    statsByNgo[r.ngo_id].sum += r.stars;
    statsByNgo[r.ngo_id].count += 1;
    if (r.user_id === userId) statsByNgo[r.ngo_id].mine = r;
  }
  function avgFor(ngoId) {
    const s = statsByNgo[ngoId];
    return s ? s.sum / s.count : 0;
  }
  function countFor(ngoId) {
    return statsByNgo[ngoId]?.count || 0;
  }
  function myFor(ngoId) {
    return statsByNgo[ngoId]?.mine || null;
  }

  // Top 3 by avg, min 3 reviews
  const topRatedIds = new Set(
    [...ngos]
      .filter((n) => countFor(n.id) >= 3)
      .sort((a, b) => avgFor(b.id) - avgFor(a.id))
      .slice(0, 3)
      .map((n) => n.id)
  );

  // Eligibility: donor must have at least one donation to that NGO
  const donatedNgoIds = new Set(donations.map((d) => d.ngo_id));

  // Sort NGOs by avg rating desc, ties → alphabetical
  const sortedNgos = [...ngos].sort((a, b) => {
    const diff = avgFor(b.id) - avgFor(a.id);
    if (diff !== 0) return diff;
    return (a.org_name || "").localeCompare(b.org_name || "");
  });

  return (
    <>
      <Head>
        <title>Dashboard · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden text-sm text-zinc-600 sm:inline">Donor</span>
              <Link
                href="/feedback"
                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
              >
                Feedback
              </Link>
              <Link
                href="/donor/settings"
                aria-label="Settings"
                title="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <DonationModal
          open={!!modalNgo}
          ngo={modalNgo}
          onClose={() => setModalNgo(null)}
          onDonated={reloadDonations}
        />

        <RatingModal
          open={!!ratingNgo}
          ngo={ratingNgo}
          existing={ratingNgo ? myFor(ratingNgo.id) : null}
          role="donor"
          onClose={() => setRatingNgo(null)}
          onSaved={reloadRatings}
        />

        <ReviewsModal
          open={!!reviewsNgo}
          ngo={reviewsNgo}
          onClose={() => setReviewsNgo(null)}
        />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          {!loading && name && (
            <p className="text-2xl font-bold text-zinc-700 sm:text-3xl">
              Welcome back, <span className="font-extrabold text-emerald-700">{name}</span> 👋
            </p>
          )}

          <h1 className="mt-3 text-xl font-bold text-zinc-900 sm:text-2xl">Your Impact</h1>
          <p className="mt-1 text-sm text-zinc-600">Donate to a verified NGO and track it on-chain.</p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading && <DashboardSkeleton />}

          {!loading && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
                <StatCard label="Total Donated" value={`$${total}`} />
                <StatCard label="Donations" value={donations.length} />
                <StatCard label="Completed" value={completed} accent />
              </div>

              {/* Browse NGOs */}
              <div className="mt-8">
                <h2 className="text-base font-semibold text-zinc-900">Donate to an NGO</h2>
                <p className="text-sm text-zinc-600">Choose a verified NGO to support.</p>

                {ngos.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
                    No verified NGOs available yet. Check back soon.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedNgos.map((ngo) => {
                      const avg = avgFor(ngo.id);
                      const cnt = countFor(ngo.id);
                      const mine = myFor(ngo.id);
                      const eligible = donatedNgoIds.has(ngo.id);
                      const topRated = topRatedIds.has(ngo.id);
                      return (
                        <div
                          key={ngo.id}
                          className="card-hover flex flex-col rounded-2xl border border-zinc-200 bg-white p-4"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={ngo.logo_url} name={ngo.org_name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-semibold text-zinc-900">{ngo.org_name}</h3>
                                {topRated && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                    ★ Top Rated
                                  </span>
                                )}
                              </div>
                              <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                                {ngo.category}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewsNgo(ngo)}
                            title="See all reviews"
                            className="mt-2 inline-flex w-fit items-center rounded-md px-1 py-0.5 hover:bg-zinc-100"
                          >
                            <StarRating value={avg} count={cnt} showNumber={cnt > 0} />
                          </button>
                          <p className="mt-3 flex-1 text-sm text-zinc-600 line-clamp-3">
                            {ngo.description}
                          </p>
                          <p className="mt-2 text-xs text-zinc-400">{ngo.country}</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => setModalNgo(ngo)}
                              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              Donate
                            </button>
                            <button
                              onClick={() => setRatingNgo(ngo)}
                              disabled={!eligible}
                              title={eligible ? "" : "Donate first to leave a rating"}
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:enabled:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {mine ? "Edit ★" : "Rate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Donation history */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-4">
                  <h2 className="text-base font-semibold text-zinc-900">Your Donations</h2>
                </div>

                {donations.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-zinc-500">
                    You haven't donated yet. Pick an NGO above to get started.
                  </div>
                ) : (
                  <>
                    {/* Mobile: card list */}
                    <ul className="divide-y divide-zinc-100 md:hidden">
                      {donations.map((d) => (
                        <li key={d.id} className="px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-zinc-900">{d.ngo_name}</div>
                              <div className="mt-0.5 text-xs text-zinc-500">
                                {d.donation_type} · {fmtDate(d.created_at)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-zinc-900">${d.amount}</div>
                              <Link
                                href={`/donor/track/${d.id}`}
                                className="mt-1 inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                              >
                                Track →
                              </Link>
                            </div>
                          </div>
                          <div className="mt-3">
                            <StageTracker stage={d.stage} />
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Desktop: table */}
                    <div className="hidden md:block">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                          <tr>
                            <th className="px-5 py-3">NGO</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Amount</th>
                            <th className="px-5 py-3">Stage</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((d) => (
                            <tr key={d.id} className="border-t border-zinc-100">
                              <td className="px-5 py-4 font-medium text-zinc-900">{d.ngo_name}</td>
                              <td className="px-5 py-4 text-zinc-600">{d.donation_type}</td>
                              <td className="px-5 py-4 font-semibold text-zinc-900">${d.amount}</td>
                              <td className="px-5 py-4">
                                <StageTracker stage={d.stage} />
                              </td>
                              <td className="px-5 py-4 text-zinc-500">{fmtDate(d.created_at)}</td>
                              <td className="px-5 py-4 text-right">
                                <Link
                                  href={`/donor/track/${d.id}`}
                                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                                >
                                  Track →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="h-3 w-24 rounded bg-zinc-200" />
            <div className="mt-3 h-7 w-20 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-zinc-200" />
                <div className="h-2.5 w-1/3 rounded bg-zinc-100" />
              </div>
            </div>
            <div className="mt-4 h-2.5 w-full rounded bg-zinc-100" />
            <div className="mt-2 h-2.5 w-4/5 rounded bg-zinc-100" />
            <div className="mt-5 h-9 w-full rounded-lg bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-bold sm:text-3xl ${
          accent ? "text-emerald-600" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
