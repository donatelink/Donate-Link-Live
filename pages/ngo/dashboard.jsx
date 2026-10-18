import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import CampaignModal from "@/components/CampaignModal";
import NotificationBell from "@/components/NotificationBell";
import { AssignPayoutModal, assignable, openRequests, payoutTotals } from "@/components/PayoutEditor";
import StageAdvanceModal from "@/components/StageAdvanceModal";
import Pagination, { usePaged } from "@/components/Pagination";
import supabase from "@/utils/supabase";

const STAGE_LABELS = ["Pending", "Confirmed", "Allocated", "Transferred", "Completed"];

const REQ_STATUS_LABEL = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  funded: "Funded",
};

const REQ_STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  funded: "bg-emerald-600 text-white",
  rejected: "bg-red-100 text-red-700",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

// Fetch beneficiary profiles for a set of requests, keyed by user_id.
// RLS limits this NGO to profiles of beneficiaries who requested from it.
async function fetchProfiles(reqList) {
  const ids = [...new Set((reqList || []).map((r) => r.beneficiary_id).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("beneficiary_profiles")
    .select("*")
    .in("user_id", ids);
  const map = {};
  for (const p of data || []) map[p.user_id] = p;
  return map;
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// Split progress under a row: how much of a donation went to beneficiaries, or
// how much a beneficiary has received so far.
function PayoutLine({ r, isBen, totals, leftToGive, onAssign }) {
  if (isBen) {
    const got = totals.byRequest[r.id] || 0;
    if (got <= 0) return null;
    return (
      <p className="mt-1.5 text-xs font-medium text-blue-700">
        Received {money(got)} of {money(r.amount)}
      </p>
    );
  }
  const given = totals.byDonation[r.id] || 0;
  if (given <= 0) return null;
  const left = leftToGive(r);
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-700">
      Given to beneficiaries: {money(given)} of {money(assignable(r))}
      {left > 0 && (
        <button
          onClick={() => onAssign(r)}
          className="rounded-md border border-emerald-600 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Give remaining {money(left)}
        </button>
      )}
    </p>
  );
}

// A donation whose payment hasn't cleared must not be advanced by hand.
function unpaidLabel(d) {
  if (d.payment_status === "pending" || d.onchain_status === "pending") return "Awaiting payment";
  if (d.payment_status === "failed" || d.onchain_status === "failed") return "Payment failed";
  return null;
}

function StageBadge({ stage }) {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      Stage {stage} · {STAGE_LABELS[stage - 1]}
    </span>
  );
}

const MENU = [
  { id: "donations", label: "Donations", icon: "💸" },
  { id: "requests", label: "Beneficiary Requests", icon: "🤝" },
  { id: "campaigns", label: "Campaigns", icon: "📣" },
  { id: "payments", label: "Payment Methods", icon: "💳" },
];

export default function NgoDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ngo, setNgo] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [advanceRec, setAdvanceRec] = useState(null);
  const [advanceKind, setAdvanceKind] = useState("donation");
  const [view, setView] = useState("donations");

  // Stripe onboarding returns to ?view=payments — open that tab directly.
  useEffect(() => {
    const v = router.query.view;
    if (typeof v === "string" && MENU.some((m) => m.id === v)) setView(v);
  }, [router.query.view]);
  const [campaigns, setCampaigns] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [assignRec, setAssignRec] = useState(null);
  const [campaignOpen, setCampaignOpen] = useState(false);

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

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
      if (profile?.role !== "ngo") {
        router.replace("/donor/dashboard");
        return;
      }

      const { data: ngoRow, error } = await supabase
        .from("ngos")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      setNgo(ngoRow || null);

      if (ngoRow) {
        const [donRes, reqRes, campRes, payRes] = await Promise.all([
          supabase
            .from("donations")
            .select("*")
            .eq("ngo_id", ngoRow.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("beneficiary_requests")
            .select("*")
            .eq("ngo_id", ngoRow.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("campaigns")
            .select("*")
            .eq("ngo_id", ngoRow.id)
            .order("created_at", { ascending: false }),
          supabase.from("donation_payouts").select("*").eq("ngo_id", ngoRow.id),
        ]);
        if (active) {
          setDonations(donRes.data || []);
          setPayouts(payRes.data || []);
          setCampaigns(campRes.data || []);
          setRequests(reqRes.data || []);
          setProfiles(await fetchProfiles(reqRes.data || []));
        }
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function loadDonations() {
    if (!ngo) return;
    const { data } = await supabase
      .from("donations")
      .select("*")
      .eq("ngo_id", ngo.id)
      .order("created_at", { ascending: false });
    setDonations(data || []);
  }

  async function loadRequests() {
    if (!ngo) return;
    const { data } = await supabase
      .from("beneficiary_requests")
      .select("*")
      .eq("ngo_id", ngo.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setProfiles(await fetchProfiles(data || []));
  }

  async function loadCampaigns() {
    if (!ngo) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("ngo_id", ngo.id)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  }

  async function loadPayouts() {
    if (!ngo) return;
    const { data } = await supabase.from("donation_payouts").select("*").eq("ngo_id", ngo.id);
    setPayouts(data || []);
  }

  function reloadAll() {
    loadDonations();
    loadRequests();
    loadCampaigns();
    loadPayouts();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const donationLink =
    ngo?.slug && typeof window !== "undefined"
      ? `${window.location.origin}/ngo/${ngo.slug}`
      : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(donationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const totalRaised = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const completed = donations.filter((d) => d.stage === 5).length;
  const pendingReqCount = requests.filter((r) => r.status === "pending").length;
  const totals = payoutTotals(payouts);
  const payoutOptions = openRequests(requests, totals.byRequest);
  const leftToGive = (d) =>
    d ? Math.max(0, Math.round((assignable(d) - (totals.byDonation[d.id] || 0)) * 100) / 100) : 0;

  const activeMenu = MENU.find((m) => m.id === view);

  return (
    <>
      <Head>
        <title>NGO Dashboard · DonateLink</title>
      </Head>

      <StageAdvanceModal
        open={!!advanceRec}
        record={advanceRec}
        kind={advanceKind}
        payoutOptions={payoutOptions}
        payoutLeft={advanceKind === "donation" ? leftToGive(advanceRec) : 0}
        onClose={() => setAdvanceRec(null)}
        onAdvanced={reloadAll}
      />

      <AssignPayoutModal
        open={!!assignRec}
        donation={assignRec}
        left={leftToGive(assignRec)}
        options={payoutOptions}
        onClose={() => setAssignRec(null)}
        onSaved={reloadAll}
      />

      <CampaignModal
        open={campaignOpen}
        ngo={ngo}
        onClose={() => setCampaignOpen(false)}
        onSaved={loadCampaigns}
      />

      <div className="min-h-screen bg-zinc-50 md:flex">
        {/* Sidebar */}
        <aside className="border-b border-zinc-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400 md:hidden"
            >
              Sign Out
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:overflow-visible">
            {MENU.map((m) => {
              const active = view === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setView(m.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                  {m.id === "requests" && pendingReqCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingReqCount}
                    </span>
                  )}
                </button>
              );
            })}
            <Link
              href="/feedback"
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              <span>💬</span>
              <span>Feedback</span>
            </Link>
            <Link
              href="/ngo/settings"
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </nav>

          <div className="hidden px-3 pb-4 md:block">
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-page-in">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeMenu?.icon}</span>
              <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{activeMenu?.label}</h1>
              <NotificationBell className="ml-auto" />
              <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-emerald-700">
                NGO
              </span>
            </div>

            {!loading && ngo && (
              <p className="mt-3 text-2xl font-bold text-zinc-700 sm:text-4xl">
                Welcome to <span className="font-extrabold text-emerald-700">{ngo.org_name}</span>
              </p>
            )}

            {loading && <DashboardSkeleton />}

            {!loading && errorMsg && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {!loading && !ngo && !errorMsg && (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
                <div className="text-4xl">🗂️</div>
                <h2 className="mt-3 text-lg font-bold text-zinc-900">No NGO profile linked</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  We couldn't find an NGO application for this account. Contact the DonateLink admin.
                </p>
              </div>
            )}

            {!loading && ngo && ngo.status === "paused" && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
                <h2 className="text-base font-semibold text-amber-800">
                  ⏸ Your NGO is currently paused
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  You are hidden from donor and beneficiary dashboards. Existing donations and
                  requests continue. Contact the admin to resume.
                </p>
              </div>
            )}

            {!loading && ngo && ngo.status === "deleted" && (
              <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 sm:p-5">
                <h2 className="text-base font-semibold text-red-800">
                  Your NGO has been removed
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  This NGO profile was deleted by an admin. Donations and reviews are preserved
                  for record-keeping but you can no longer receive new donations or requests.
                </p>
              </div>
            )}

            {!loading && ngo && view === "donations" && (
              <DonationsView
                ngo={ngo}
                donations={donations}
                requests={requests}
                donationLink={donationLink}
                copied={copied}
                copyLink={copyLink}
                onAdvance={(rec, kind) => {
                  setAdvanceRec(rec);
                  setAdvanceKind(kind);
                }}
                totals={totals}
                leftToGive={leftToGive}
                onAssign={setAssignRec}
                totalRaised={totalRaised}
                completed={completed}
              />
            )}

            {!loading && ngo && view === "requests" && (
              <RequestsView ngo={ngo} requests={requests} profiles={profiles} reload={loadRequests} />
            )}

            {!loading && ngo && view === "payments" && (
              <PaymentMethodsView ngo={ngo} onSaved={(row) => setNgo(row)} />
            )}

            {!loading && ngo && view === "campaigns" && (
              <CampaignsView
                campaigns={campaigns}
                onNew={() => setCampaignOpen(true)}
                reload={loadCampaigns}
              />
            )}

          </div>
        </main>
      </div>
    </>
  );
}

/* ---------- Loading skeleton ---------- */
function DashboardSkeleton() {
  return (
    <div className="mt-3 animate-pulse">
      {/* welcome line */}
      <div className="h-9 w-72 rounded-lg bg-zinc-200" />

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-zinc-200" />
            <div className="mt-3 h-6 w-16 rounded bg-zinc-200" />
          </div>
        ))}
      </div>

      {/* list block */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="h-4 w-40 rounded bg-zinc-200" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-zinc-200" />
                <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Donations view ---------- */
function DonationsView({
  ngo,
  donations,
  requests,
  donationLink,
  copied,
  copyLink,
  onAdvance,
  totals,
  leftToGive,
  onAssign,
  totalRaised,
  completed,
}) {
  // Merge donor donations with verified+/funded beneficiary requests for a single list.
  const rows = [
    ...donations.map((d) => ({ ...d, _kind: "donation" })),
    ...requests
      .filter((r) => r.status === "verified" || r.status === "funded")
      .map((r) => ({ ...r, _kind: "beneficiary" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const rowsPaged = usePaged(rows);

  const payoutCount = rows.filter((r) => r._kind === "beneficiary").length;
  const payoutCommitted = rows
    .filter((r) => r._kind === "beneficiary")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <p className="mt-1 text-sm text-zinc-600">
        Manage donations to <span className="font-semibold">{ngo.org_name}</span> and payouts to
        verified beneficiaries — all on the same 5-stage flow.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Total Raised" value={`$${totalRaised}`} />
        <StatCard label="Donations" value={donations.length} />
        <StatCard label="Payouts" value={`${payoutCount} · $${payoutCommitted}`} />
        <StatCard label="Completed" value={completed} accent />
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Your public donation link
        </div>
        <p className="mt-1 text-xs text-emerald-700">
          Share this link anywhere — donors use it to give directly to your NGO.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="break-all rounded-md bg-white px-3 py-2 text-xs text-emerald-800">
            {donationLink || "Link unavailable"}
          </code>
          {donationLink && (
            <button
              onClick={copyLink}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-zinc-900">Donations & Payouts</h2>
          <p className="text-xs text-zinc-500">
            Donor donations and verified beneficiary payouts. Advance each through the 5 stages.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            Nothing here yet. Share your donation link, or verify a beneficiary request to start
            a payout.
          </div>
        ) : (
<>
          <ul className="divide-y divide-zinc-100">
            {rowsPaged.pageItems.map((r) => {
              const isBen = r._kind === "beneficiary";
              const personName = isBen ? r.beneficiary_name : r.donor_name;
              const personEmail = isBen ? r.beneficiary_email : r.donor_email;
              const subtype = isBen ? "Beneficiary Payout" : r.donation_type;
              return (
                <li key={`${r._kind}-${r.id}`} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isBen ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isBen ? "NGO → Beneficiary" : "Donor → NGO"}
                        </span>
                        <span className="font-semibold text-zinc-900">{personName}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {personEmail} · {subtype} · {fmtDate(r.created_at)}
                      </div>
                      <div className="mt-2">
                        <StageBadge stage={r.stage} />
                      </div>
                      <PayoutLine r={r} isBen={isBen} totals={totals} leftToGive={leftToGive} onAssign={onAssign} />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-zinc-900">${r.amount}</div>
                      {!isBen && unpaidLabel(r) ? (
                        <span className="mt-2 inline-block text-xs font-semibold text-amber-600">
                          {unpaidLabel(r)}
                        </span>
                      ) : r.stage < 5 ? (
                        <button
                          onClick={() => onAdvance(r, r._kind)}
                          className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Advance → {STAGE_LABELS[r.stage]}
                        </button>
                      ) : (
                        <span className="mt-2 inline-block text-xs font-semibold text-emerald-600">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                  {!isBen && r.note && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                      Note to donor: {r.note}
                    </p>
                  )}
                  {isBen && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 line-clamp-2">
                      Request: {r.reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
<Pagination paged={rowsPaged} className="border-t border-zinc-100" />
</>
        )}
      </div>
    </>
  );
}

/* ---------- Beneficiary Requests view ---------- */
function RequestsView({ requests, profiles = {}, reload }) {
  const reqPaged = usePaged(requests);
  const [actingId, setActingId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function verify(req) {
    setActingId(req.id);
    setErrorMsg("");
    const { error } = await supabase
      .from("beneficiary_requests")
      .update({ status: "verified", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) setErrorMsg(error.message);
    else await reload();
    setActingId(null);
  }

  async function submitReject() {
    if (!rejectId) return;
    setActingId(rejectId);
    setErrorMsg("");
    const { error } = await supabase
      .from("beneficiary_requests")
      .update({
        status: "rejected",
        ngo_note: rejectNote.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rejectId);
    if (error) setErrorMsg(error.message);
    else {
      await reload();
      setRejectId(null);
      setRejectNote("");
    }
    setActingId(null);
  }

  if (requests.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No beneficiary requests yet.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {reqPaged.pageItems.map((r) => {
        const p = profiles[r.beneficiary_id];
        return (
        <div key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{r.beneficiary_name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    REQ_STATUS_BADGE[r.status] || "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {REQ_STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {r.status === "pending"
                  ? "Contact hidden until verified"
                  : r.beneficiary_email}
                {" · "}
                {fmtDate(r.created_at)}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{r.reason}</p>

              {r.proof_url && (
                <a
                  href={r.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-600 underline"
                >
                  📎 View attached proof
                </a>
              )}
              {r.ngo_note && (
                <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  Your note: {r.ngo_note}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="font-bold text-zinc-900">${r.amount}</div>
              {r.status === "pending" && (
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    onClick={() => verify(r)}
                    disabled={actingId === r.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-60"
                  >
                    {actingId === r.id ? "..." : "Verify"}
                  </button>
                  <button
                    onClick={() => {
                      setRejectId(r.id);
                      setRejectNote("");
                    }}
                    disabled={actingId === r.id}
                    className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:enabled:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
              {r.status === "verified" && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  Now in Donations tab — advance stages to fund
                </p>
              )}
              {r.status === "funded" && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  ✓ Funded · Stage {r.stage}/5
                </p>
              )}
            </div>
          </div>

          {p ? (
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-zinc-100 pt-3 text-xs">
              <div>
                <dt className="font-semibold text-zinc-500">Father name</dt>
                <dd className="text-zinc-800">{p.father_name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-500">Government ID</dt>
                <dd className="text-zinc-800">{p.gov_id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-500">Phone</dt>
                <dd className="text-zinc-800">{p.phone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-500">Family members</dt>
                <dd className="text-zinc-800">{p.family_members}</dd>
              </div>
              <div className="min-w-0 flex-1">
                <dt className="font-semibold text-zinc-500">Address</dt>
                <dd className="text-zinc-800">{p.address}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Beneficiary has not completed their profile.
            </p>
          )}
        </div>
        );
      })}

      <Pagination paged={reqPaged} className="px-0 sm:px-0" />

      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setRejectId(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-200 px-6 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Reject request</h2>
            </div>
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-zinc-600">
                Tell the beneficiary why (optional). They can re-apply next month.
              </p>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason for rejection"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <button
                onClick={() => setRejectId(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={actingId === rejectId}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-red-700 disabled:opacity-50"
              >
                {actingId === rejectId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- shared ---------- */
function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-2 text-xl font-bold sm:text-2xl ${
          accent ? "text-emerald-600" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Payment methods (how the NGO collects donations) ---------- */
async function authHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
}

function PaymentMethodsView({ ngo, onSaved }) {
  const [stripeInfo, setStripeInfo] = useState({
    connected: !!ngo.stripe_account_id,
    chargesEnabled: !!ngo.stripe_charges_enabled,
  });
  const [stripeBusy, setStripeBusy] = useState(false);
  const [wallet, setWallet] = useState(ngo.wallet_address || "");
  const [walletSaving, setWalletSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function callStripe(action) {
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Stripe request failed");
    return body;
  }

  // Re-check with Stripe on open, so finishing onboarding shows up right away.
  useEffect(() => {
    if (!ngo.stripe_account_id) return;
    callStripe("status")
      .then((info) => setStripeInfo(info))
      .catch((err) => setErrorMsg(err.message));
  }, [ngo.stripe_account_id]);

  async function connectStripe() {
    setStripeBusy(true);
    setErrorMsg("");
    try {
      const { url } = await callStripe("onboard");
      window.location.assign(url);
    } catch (err) {
      setErrorMsg(err.message);
      setStripeBusy(false);
    }
  }

  async function saveWallet() {
    setOkMsg("");
    setErrorMsg("");
    const value = wallet.trim();
    if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setErrorMsg("Wallet address must be 0x followed by 40 hexadecimal characters.");
      return;
    }
    setWalletSaving(true);
    const { data, error } = await supabase
      .from("ngos")
      .update({ wallet_address: value || null })
      .eq("id", ngo.id)
      .select()
      .single();
    setWalletSaving(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    onSaved(data);
    setOkMsg(value ? "Wallet saved." : "Wallet removed.");
  }

  const walletOn = !!ngo.wallet_address;
  const cardOn = stripeInfo.chargesEnabled;

  return (
    <div className="mt-6 max-w-3xl space-y-4">
      <p className="text-sm text-zinc-600">
        Donors can pay you in two ways. Both send money straight to you — DonateLink never holds the
        funds.
      </p>

      {okMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {okMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">💳 Card (Stripe)</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Visa / Mastercard. Paid into your own Stripe account; Stripe&apos;s card fee (2.9% +
              $0.30) is deducted from your share.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              cardOn ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {cardOn ? "✓ Accepting cards" : stripeInfo.connected ? "Setup not finished" : "Not connected"}
          </span>
        </div>
        {!cardOn && (
          <button
            onClick={connectStripe}
            disabled={stripeBusy}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:enabled:bg-zinc-700 disabled:opacity-60"
          >
            {stripeBusy ? "Opening Stripe…" : stripeInfo.connected ? "Finish Stripe setup" : "Connect Stripe"}
          </button>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Setup happens on Stripe&apos;s secure page. In test mode use Stripe&apos;s test data — no real
          documents.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">⛓️ Polygon (crypto)</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Donors pay from MetaMask; the smart contract records the donation on-chain and sends 100%
              to this wallet. No platform fee.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              walletOn ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {walletOn ? "✓ Accepting POL" : "No wallet"}
          </span>
        </div>
        <label htmlFor="pm_wallet" className="mt-4 block text-sm font-medium text-zinc-700">
          Payout wallet address
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="pm_wallet"
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x0000000000000000000000000000000000000000"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            onClick={saveWallet}
            disabled={walletSaving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-60"
          >
            {walletSaving ? "Saving…" : "Save wallet"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          <strong>Double-check it:</strong> crypto sent to a wrong address cannot be recovered.
          Network: Polygon Amoy (testnet).
        </p>
      </section>

      {!cardOn && !walletOn && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Donors cannot pay you yet. Connect Stripe or add a wallet to start receiving donations.
        </p>
      )}
    </div>
  );
}

/* ---------- Campaigns (fundraising goals) ---------- */
const CAMPAIGN_BADGE = {
  active: ["Active", "bg-emerald-100 text-emerald-700"],
  completed: ["Goal reached 🎉", "bg-emerald-600 text-white"],
  closed: ["Closed", "bg-zinc-200 text-zinc-700"],
};

function CampaignsView({ campaigns, onNew, reload }) {
  const paged = usePaged(campaigns);
  const [closingId, setClosingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function closeEarly(c) {
    if (!window.confirm(`Close "${c.title}" now? It will stop accepting donations.`)) return;
    setErrorMsg("");
    setClosingId(c.id);
    const { error } = await supabase.rpc("close_campaign", { p_campaign: c.id });
    setClosingId(null);
    if (error) return setErrorMsg(error.message);
    reload();
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-zinc-600">
          Ask donors for a set amount for one cause. A campaign closes by itself once the goal is
          raised, and its money can only be spent on that campaign.
        </p>
        <button
          onClick={onNew}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + New campaign
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-600">
          No campaigns yet. Start one to raise a set amount for a cause.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {paged.pageItems.map((c) => {
              const pct = Math.min(100, (Number(c.raised) / Number(c.goal)) * 100);
              const [label, cls] = CAMPAIGN_BADGE[c.status] || CAMPAIGN_BADGE.active;
              return (
                <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900">{c.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {c.cause} · started {fmtDate(c.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
                      {label}
                    </span>
                  </div>
                  {c.description && (
                    <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-bold text-emerald-600">{money(c.raised)}</span>
                      <span className="text-zinc-500">
                        {" "}
                        of {money(c.goal)} · {c.donor_count} donor{c.donor_count === 1 ? "" : "s"}
                      </span>
                    </p>
                    {c.status === "active" && (
                      <button
                        onClick={() => closeEarly(c)}
                        disabled={closingId === c.id}
                        className="text-xs font-semibold text-zinc-500 hover:text-red-600 disabled:opacity-50"
                      >
                        {closingId === c.id ? "Closing…" : "Close early"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination paged={paged} className="px-0 sm:px-0" />
        </>
      )}
    </div>
  );
}
