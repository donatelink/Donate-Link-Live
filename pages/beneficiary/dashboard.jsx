import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import RatingModal from "@/components/RatingModal";
import RequestFundingModal from "@/components/RequestFundingModal";
import ReviewsModal from "@/components/ReviewsModal";
import StarRating from "@/components/StarRating";
import supabase from "@/utils/supabase";

const STATUS_LABEL = {
  pending: "Pending review",
  verified: "Verified — awaiting funds",
  funded: "Funded",
  rejected: "Rejected",
};

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  funded: "bg-emerald-600 text-white",
  rejected: "bg-red-100 text-red-700",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="h-3 w-28 rounded bg-zinc-200" />
        <div className="mt-3 h-5 w-2/3 rounded bg-zinc-200" />
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

export default function BeneficiaryDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ngos, setNgos] = useState([]);
  const [requests, setRequests] = useState([]);
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
      // Gate: a beneficiary must complete their profile before the dashboard.
      const { data: profile } = await supabase
        .from("beneficiary_profiles")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (!profile) {
        router.replace("/beneficiary/profile");
        return;
      }
      const [ngoRes, reqRes, ratingRes, userRes] = await Promise.all([
        supabase.from("ngos").select("*").eq("status", "approved").order("org_name"),
        supabase
          .from("beneficiary_requests")
          .select("*")
          .eq("beneficiary_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("ngo_ratings").select("*"),
        supabase.from("users").select("name").eq("id", session.user.id).single(),
      ]);
      if (!active) return;
      if (ngoRes.error) setErrorMsg(ngoRes.error.message);
      if (reqRes.error) setErrorMsg(reqRes.error.message);
      setUserId(session.user.id);
      setName(userRes.data?.name || "");
      setNgos(ngoRes.data || []);
      setRequests(reqRes.data || []);
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

  async function reloadRequests() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("beneficiary_requests")
      .select("*")
      .eq("beneficiary_id", session.user.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Per-NGO rating stats
  const statsByNgo = {};
  for (const r of ratings) {
    if (!statsByNgo[r.ngo_id]) statsByNgo[r.ngo_id] = { sum: 0, count: 0, mine: null };
    statsByNgo[r.ngo_id].sum += r.stars;
    statsByNgo[r.ngo_id].count += 1;
    if (r.user_id === userId) statsByNgo[r.ngo_id].mine = r;
  }
  const avgFor = (id) => (statsByNgo[id] ? statsByNgo[id].sum / statsByNgo[id].count : 0);
  const countFor = (id) => statsByNgo[id]?.count || 0;
  const myFor = (id) => statsByNgo[id]?.mine || null;

  const topRatedIds = new Set(
    [...ngos]
      .filter((n) => countFor(n.id) >= 3)
      .sort((a, b) => avgFor(b.id) - avgFor(a.id))
      .slice(0, 3)
      .map((n) => n.id)
  );

  // Eligibility: at least one FUNDED request to this NGO
  const fundedNgoIds = new Set(
    requests.filter((r) => r.status === "funded").map((r) => r.ngo_id)
  );

  const sortedNgos = [...ngos].sort((a, b) => {
    const diff = avgFor(b.id) - avgFor(a.id);
    if (diff !== 0) return diff;
    return (a.org_name || "").localeCompare(b.org_name || "");
  });

  const activeRequest = requests.find((r) =>
    ["pending", "verified"].includes(r.status)
  );
  const submittedThisMonth = requests.find(
    (r) => new Date(r.created_at) >= startOfMonth
  );
  const canRequest = !activeRequest && !submittedThisMonth;
  const lockReason = activeRequest
    ? "You have an active request — wait for it to complete."
    : submittedThisMonth
    ? "You've already submitted a request this month."
    : null;

  return (
    <>
      <Head>
        <title>Beneficiary Dashboard · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:px-3">
                Beneficiary
              </span>
              <Link
                href="/feedback"
                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
              >
                Feedback
              </Link>
              <Link
                href="/beneficiary/settings"
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

        <RequestFundingModal
          open={!!modalNgo}
          ngo={modalNgo}
          onClose={() => setModalNgo(null)}
          onSubmitted={reloadRequests}
        />

        <RatingModal
          open={!!ratingNgo}
          ngo={ratingNgo}
          existing={ratingNgo ? myFor(ratingNgo.id) : null}
          role="beneficiary"
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

          <h1 className="mt-3 text-xl font-bold text-zinc-900 sm:text-2xl">Get help when you need it</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pick a verified NGO and submit one funding request per month.
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading && <DashboardSkeleton />}

          {!loading && activeRequest && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Active request
                  </div>
                  <h2 className="mt-1 font-semibold text-zinc-900">
                    To {activeRequest.ngo_name} · ${activeRequest.amount}
                  </h2>
                  <p className="mt-1 text-xs text-emerald-700">
                    Status: {STATUS_LABEL[activeRequest.status]}
                  </p>
                </div>
                <Link
                  href={`/beneficiary/request/${activeRequest.id}`}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  View request →
                </Link>
              </div>
            </div>
          )}

          {!loading && (
            <>
              <div className="mt-8">
                <h2 className="text-base font-semibold text-zinc-900">Choose an NGO</h2>
                <p className="text-sm text-zinc-600">
                  {lockReason || "Pick any verified NGO and submit your request."}
                </p>

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
                      const eligible = fundedNgoIds.has(ngo.id);
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
                              disabled={!canRequest}
                              title={lockReason || ""}
                              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                            >
                              {canRequest ? "Request Funding" : "1/month limit"}
                            </button>
                            <button
                              onClick={() => setRatingNgo(ngo)}
                              disabled={!eligible}
                              title={eligible ? "" : "Receive funding first to leave a rating"}
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

              {requests.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-4">
                    <h2 className="text-base font-semibold text-zinc-900">Your Requests</h2>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {requests.map((r) => (
                      <li key={r.id} className="px-4 py-4 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900">{r.ngo_name}</div>
                            <div className="mt-0.5 text-xs text-zinc-500">
                              ${r.amount} · {fmtDate(r.created_at)}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  STATUS_BADGE[r.status] || "bg-zinc-100 text-zinc-700"
                                }`}
                              >
                                {STATUS_LABEL[r.status] || r.status}
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/beneficiary/request/${r.id}`}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            View →
                          </Link>
                        </div>
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
