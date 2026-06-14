import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import StageAdvanceModal from "@/components/StageAdvanceModal";
import supabase from "@/utils/supabase";

const STAGE_LABEL = { 1: "Pending", 2: "Confirmed", 3: "Allocated", 4: "Transferred", 5: "Completed" };

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paused: "bg-zinc-200 text-zinc-700",
  deleted: "bg-red-200 text-red-800",
};

const MENU = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "approvals", label: "NGO Approvals", icon: "✅" },
  { id: "donations", label: "Donations", icon: "💸" },
  { id: "ngos", label: "NGOs", icon: "🏢" },
  { id: "donors", label: "Donors", icon: "🧑" },
  { id: "beneficiaries", label: "Beneficiaries", icon: "🤝" },
  { id: "requests", label: "Beneficiary Requests", icon: "📥" },
  { id: "feedback", label: "Feedback", icon: "💬" },
];

const FEEDBACK_BADGE = {
  General: "bg-zinc-100 text-zinc-700",
  Bug: "bg-red-100 text-red-700",
  Suggestion: "bg-emerald-100 text-emerald-700",
  Complaint: "bg-amber-100 text-amber-700",
};

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

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState("overview");

  const [ngos, setNgos] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actingId, setActingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [advanceRec, setAdvanceRec] = useState(null);
  const [advanceKind, setAdvanceKind] = useState("donation");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    const [ngoRes, donRes, reqRes, fbRes] = await Promise.all([
      supabase.from("ngos").select("*").order("created_at", { ascending: false }),
      supabase.from("donations").select("*").order("created_at", { ascending: false }),
      supabase
        .from("beneficiary_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    if (ngoRes.error) setError(ngoRes.error.message);
    if (donRes.error) setError(donRes.error.message);
    if (reqRes.error) setError(reqRes.error.message);
    if (fbRes.error) setError(fbRes.error.message);
    setNgos(ngoRes.data || []);
    setDonations(donRes.data || []);
    setRequests(reqRes.data || []);
    setFeedback(fbRes.data || []);
    setLoading(false);
  }

  async function loadDonations() {
    const { data } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });
    setDonations(data || []);
  }

  async function approve(ngo) {
    setActingId(ngo.id);
    setError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Your admin session expired — please sign in again.");
      setActingId(null);
      return;
    }
    const res = await fetch("/api/approve-ngo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ngoId: ngo.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error || "Approval failed.");
    else await loadAll();
    setActingId(null);
  }

  async function reject(ngo) {
    if (
      !window.confirm(
        `Reject and delete "${ngo.org_name}"'s application? This removes them from the system.`
      )
    )
      return;
    setActingId(ngo.id);
    const { error: e } = await supabase
      .from("ngos")
      .update({ status: "deleted" })
      .eq("id", ngo.id);
    if (e) setError(e.message);
    else await loadAll();
    setActingId(null);
  }

  async function setStatus(ngo, newStatus) {
    setActingId(ngo.id);
    setError("");
    const { error: e } = await supabase
      .from("ngos")
      .update({ status: newStatus })
      .eq("id", ngo.id);
    if (e) setError(e.message);
    else await loadAll();
    setActingId(null);
  }

  async function softDelete(ngo) {
    if (
      !window.confirm(
        `Soft-delete "${ngo.org_name}"? It will be hidden from all dashboards but its donations and reviews will be preserved.`
      )
    )
      return;
    await setStatus(ngo, "deleted");
  }

  function ngoLink(slug) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/ngo/${slug}`;
  }

  async function copyLink(ngo) {
    try {
      await navigator.clipboard.writeText(ngoLink(ngo.slug));
      setCopiedId(ngo.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Couldn't copy — copy the link manually.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const pendingCount = ngos.filter((n) => n.status === "pending").length;

  // Derived: per-NGO stats
  const ngoStats = ngos.map((n) => {
    const list = donations.filter((d) => d.ngo_id === n.id);
    return {
      ...n,
      donCount: list.length,
      raised: list.reduce((s, d) => s + Number(d.amount), 0),
    };
  });

  // Derived: donor directory aggregated from donations
  const donorMap = {};
  for (const d of donations) {
    const key = d.donor_id || d.donor_email || d.donor_name;
    if (!donorMap[key]) {
      donorMap[key] = { name: d.donor_name, email: d.donor_email, count: 0, total: 0 };
    }
    donorMap[key].count += 1;
    donorMap[key].total += Number(d.amount);
  }
  const donors = Object.values(donorMap).sort((a, b) => b.total - a.total);

  const totalVolume = donations.reduce((s, d) => s + Number(d.amount), 0);

  // Derived: beneficiary directory aggregated from requests
  const beneficiaryMap = {};
  for (const r of requests) {
    const key = r.beneficiary_id || r.beneficiary_email || r.beneficiary_name;
    if (!beneficiaryMap[key]) {
      beneficiaryMap[key] = {
        name: r.beneficiary_name,
        email: r.beneficiary_email,
        count: 0,
        totalAsked: 0,
        lastStatus: r.status,
      };
    }
    beneficiaryMap[key].count += 1;
    beneficiaryMap[key].totalAsked += Number(r.amount);
  }
  const beneficiaries = Object.values(beneficiaryMap).sort(
    (a, b) => b.totalAsked - a.totalAsked
  );

  const pendingReqCount = requests.filter((r) => r.status === "pending").length;
  const verifiedRequests = requests.filter((r) => r.status === "verified");

  const activeMenu = MENU.find((m) => m.id === view);

  return (
    <>
      <Head>
        <title>Admin · DonateLink</title>
      </Head>

      <StageAdvanceModal
        open={!!advanceRec}
        record={advanceRec}
        kind={advanceKind}
        verifiedRequests={verifiedRequests}
        onClose={() => setAdvanceRec(null)}
        onAdvanced={loadAll}
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
                  {m.id === "approvals" && pendingCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                  {m.id === "requests" && pendingReqCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingReqCount}
                    </span>
                  )}
                </button>
              );
            })}
            <Link
              href="/admin/settings"
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
              <span className="ml-auto rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-emerald-700">
                Admin
              </span>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <DashboardSkeleton />
            ) : (
              <div className="mt-6">
                {view === "overview" && (
                  <OverviewView
                    ngos={ngos}
                    donations={donations}
                    ngoStats={ngoStats}
                    pendingCount={pendingCount}
                    totalVolume={totalVolume}
                    approve={approve}
                    reject={reject}
                    actingId={actingId}
                  />
                )}
                {view === "approvals" && (
                  <ApprovalsView
                    ngos={ngos}
                    actingId={actingId}
                    approve={approve}
                    reject={reject}
                    ngoLink={ngoLink}
                    copyLink={copyLink}
                    copiedId={copiedId}
                  />
                )}
                {view === "donations" && (
                  <DonationsView
                    donations={donations}
                    requests={requests}
                    onAdvance={(rec, kind) => {
                      setAdvanceRec(rec);
                      setAdvanceKind(kind);
                    }}
                  />
                )}
                {view === "ngos" && (
                  <NgosView
                    ngoStats={ngoStats}
                    ngoLink={ngoLink}
                    actingId={actingId}
                    setStatus={setStatus}
                    softDelete={softDelete}
                  />
                )}
                {view === "donors" && <DonorsView donors={donors} />}
                {view === "beneficiaries" && <BeneficiariesView beneficiaries={beneficiaries} />}
                {view === "requests" && <RequestsView requests={requests} />}
                {view === "feedback" && <FeedbackView feedback={feedback} />}
              </div>
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
    <div className="mt-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="mt-3 h-6 w-12 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
            <div className="h-4 w-40 rounded bg-zinc-200" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-zinc-200" />
                    <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                  </div>
                  <div className="h-7 w-20 rounded-lg bg-zinc-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */
function OverviewView({ ngos, donations, ngoStats, pendingCount, totalVolume, approve, reject, actingId }) {
  const approved = ngos.filter((n) => n.status === "approved").length;
  const completed = donations.filter((d) => d.stage === 5).length;

  // This-month snapshot
  const now = new Date();
  const monthDonations = donations.filter((d) => {
    const dt = new Date(d.created_at);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
  const monthVolume = monthDonations.reduce((s, d) => s + Number(d.amount), 0);
  const monthCompleted = monthDonations.filter((d) => d.stage === 5).length;
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  // Pending NGO approvals
  const pendingNgos = ngos.filter((n) => n.status === "pending");

  // Top NGOs by volume
  const topNgos = [...ngoStats]
    .filter((n) => n.raised > 0)
    .sort((a, b) => b.raised - a.raised)
    .slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total NGOs" value={ngos.length} />
        <StatCard label="Pending" value={pendingCount} accent="amber" />
        <StatCard label="Approved NGOs" value={approved} />
        <StatCard label="Donations" value={donations.length} />
        <StatCard label="Completed" value={completed} accent="emerald" />
        <StatCard label="Total Volume" value={`$${totalVolume}`} />
      </div>

      {/* This Month snapshot */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">This Month</h2>
          <span className="text-xs text-zinc-500">{monthName}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-zinc-900">{monthDonations.length}</div>
            <div className="text-xs text-zinc-500">Donations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900">${monthVolume}</div>
            <div className="text-xs text-zinc-500">Volume</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{monthCompleted}</div>
            <div className="text-xs text-zinc-500">Completed</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Pending NGO Approvals */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Pending NGO Approvals</h2>
            {pendingNgos.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {pendingNgos.length}
              </span>
            )}
          </div>
          {pendingNgos.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No NGOs awaiting approval. 🎉</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {pendingNgos.slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{n.org_name}</div>
                    <div className="truncate text-xs text-zinc-500">
                      {n.contact_person || "—"} · {fmtDate(n.created_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => approve(n)}
                      disabled={actingId === n.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actingId === n.id ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => reject(n)}
                      disabled={actingId === n.id}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top NGOs by Volume */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Top NGOs by Volume</h2>
          {topNgos.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No donations yet.</p>
          ) : (
            <ol className="mt-2 divide-y divide-zinc-100">
              {topNgos.map((n, i) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-900">{n.org_name}</div>
                      <div className="text-xs text-zinc-500">{n.donCount} donations</div>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-zinc-900">${n.raised}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- NGO Approvals ---------- */
function ApprovalsView({ ngos, actingId, approve, reject, ngoLink, copyLink, copiedId }) {
  if (ngos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No NGO applications yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {ngos.map((ngo) => (
        <div key={ngo.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{ngo.org_name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                    STATUS_BADGE[ngo.status] || "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {ngo.status}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {ngo.category}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{ngo.description}</p>
            </div>

            {ngo.status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => approve(ngo)}
                  disabled={actingId === ngo.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-60"
                >
                  {actingId === ngo.id ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => reject(ngo)}
                  disabled={actingId === ngo.id}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:enabled:bg-red-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Detail label="Reg. No." value={ngo.reg_number} />
            <Detail label="Contact" value={ngo.contact_person} />
            <Detail label="Phone" value={ngo.phone} />
            <Detail label="Email" value={ngo.email} />
            <Detail label="Country" value={ngo.country} />
            <Detail label="Website" value={ngo.website || "—"} />
          </dl>

          {ngo.status === "approved" && ngo.slug && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-xs font-semibold text-emerald-700">Donation link:</span>
              <code className="break-all text-xs text-emerald-800">{ngoLink(ngo.slug)}</code>
              <button
                onClick={() => copyLink(ngo)}
                className="ml-auto rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {copiedId === ngo.id ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Donations ---------- */
function DonationsView({ donations, requests, onAdvance }) {
  const rows = [
    ...donations.map((d) => ({ ...d, _kind: "donation" })),
    ...requests
      .filter((r) => r.status === "verified" || r.status === "funded")
      .map((r) => ({ ...r, _kind: "beneficiary" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No donations or payouts yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {/* Mobile cards */}
      <ul className="divide-y divide-zinc-100 md:hidden">
        {rows.map((r) => {
          const isBen = r._kind === "beneficiary";
          const personName = isBen ? r.beneficiary_name : r.donor_name;
          return (
            <li key={`${r._kind}-${r.id}`} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isBen ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isBen ? "NGO → Beneficiary" : "Donor → NGO"}
                  </span>
                  <div className="mt-1 font-semibold text-zinc-900">{personName}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {isBen ? "← " : "→ "}
                    {r.ngo_name} · {fmtDate(r.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-zinc-900">${r.amount}</div>
                  <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                    {r.stage} · {STAGE_LABEL[r.stage]}
                  </span>
                </div>
              </div>
              {r.stage < 5 ? (
                <button
                  onClick={() => onAdvance(r, r._kind)}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Advance Stage →
                </button>
              ) : (
                <p className="mt-3 text-center text-xs font-semibold text-emerald-600">✓ Completed</p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Person</th>
              <th className="px-5 py-3">NGO</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Stage</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isBen = r._kind === "beneficiary";
              const personName = isBen ? r.beneficiary_name : r.donor_name;
              return (
                <tr key={`${r._kind}-${r.id}`} className="border-t border-zinc-100">
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isBen ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isBen ? "Payout" : "Donation"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-zinc-900">{personName}</td>
                  <td className="px-5 py-4 text-zinc-700">{r.ngo_name}</td>
                  <td className="px-5 py-4 font-semibold text-zinc-900">${r.amount}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {r.stage} · {STAGE_LABEL[r.stage]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    {r.stage < 5 ? (
                      <button
                        onClick={() => onAdvance(r, r._kind)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Advance Stage →
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">✓ Completed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- NGOs ---------- */
function NgosView({ ngoStats, ngoLink, actingId, setStatus, softDelete }) {
  if (ngoStats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No NGOs yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {ngoStats.map((n) => (
        <div key={n.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{n.org_name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                    STATUS_BADGE[n.status] || "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {n.status}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {n.category}
                </span>
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-400">Donations</div>
                <div className="font-bold text-zinc-900">{n.donCount}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-400">Raised</div>
                <div className="font-bold text-emerald-600">${n.raised}</div>
              </div>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Detail label="Contact" value={n.contact_person} />
            <Detail label="Email" value={n.email} />
            <Detail label="Phone" value={n.phone} />
            <Detail label="Country" value={n.country} />
          </dl>
          {n.status === "approved" && n.slug && (
            <p className="mt-2 break-all text-xs text-emerald-700">{ngoLink(n.slug)}</p>
          )}

          {(n.status === "approved" || n.status === "paused") && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              {n.status === "approved" ? (
                <button
                  onClick={() => setStatus(n, "paused")}
                  disabled={actingId === n.id}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:enabled:border-zinc-400 disabled:opacity-60"
                >
                  {actingId === n.id ? "..." : "⏸ Pause"}
                </button>
              ) : (
                <button
                  onClick={() => setStatus(n, "approved")}
                  disabled={actingId === n.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-60"
                >
                  {actingId === n.id ? "..." : "▶ Resume"}
                </button>
              )}
              <button
                onClick={() => softDelete(n)}
                disabled={actingId === n.id}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:enabled:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
              {n.status === "paused" && (
                <span className="text-xs text-zinc-500">
                  Hidden from donors/beneficiaries until resumed.
                </span>
              )}
            </div>
          )}
          {n.status === "deleted" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              <button
                onClick={() => setStatus(n, "approved")}
                disabled={actingId === n.id}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-60"
              >
                {actingId === n.id ? "..." : "Restore"}
              </button>
              <span className="text-xs text-zinc-500">
                Soft-deleted. Donations and reviews preserved.
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Donors ---------- */
function DonorsView({ donors }) {
  if (donors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No donors yet — no donations have been made.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {/* Mobile cards */}
      <ul className="divide-y divide-zinc-100 md:hidden">
        {donors.map((d, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900">{d.name}</div>
              <div className="truncate text-xs text-zinc-500">{d.email}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-600">${d.total}</div>
              <div className="text-xs text-zinc-500">{d.count} donation(s)</div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3">Donor</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Donations</th>
              <th className="px-5 py-3 text-right">Total Donated</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((d, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-5 py-4 font-medium text-zinc-900">{d.name}</td>
                <td className="px-5 py-4 text-zinc-600">{d.email}</td>
                <td className="px-5 py-4 text-zinc-700">{d.count}</td>
                <td className="px-5 py-4 text-right font-semibold text-emerald-600">${d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Beneficiaries ---------- */
function BeneficiariesView({ beneficiaries }) {
  if (beneficiaries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No beneficiaries yet — no requests have been submitted.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <ul className="divide-y divide-zinc-100 md:hidden">
        {beneficiaries.map((b, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900">{b.name}</div>
              <div className="truncate text-xs text-zinc-500">{b.email}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-600">${b.totalAsked}</div>
              <div className="text-xs text-zinc-500">{b.count} request(s)</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3">Beneficiary</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Requests</th>
              <th className="px-5 py-3 text-right">Total Asked</th>
            </tr>
          </thead>
          <tbody>
            {beneficiaries.map((b, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-5 py-4 font-medium text-zinc-900">{b.name}</td>
                <td className="px-5 py-4 text-zinc-600">{b.email}</td>
                <td className="px-5 py-4 text-zinc-700">{b.count}</td>
                <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                  ${b.totalAsked}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Beneficiary Requests ---------- */
function RequestsView({ requests }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No beneficiary requests yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {requests.map((r) => (
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
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  → {r.ngo_name}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {r.beneficiary_email} · {fmtDate(r.created_at)}
              </div>
              <p className="mt-2 text-sm text-zinc-700 line-clamp-3">{r.reason}</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-zinc-900">${r.amount}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Feedback ---------- */
function FeedbackView({ feedback }) {
  if (feedback.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        No feedback submitted yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {feedback.map((f) => (
        <div key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                FEEDBACK_BADGE[f.category] || "bg-zinc-100 text-zinc-700"
              }`}
            >
              {f.category}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold capitalize text-zinc-600">
              {f.role}
            </span>
            <span className="ml-auto text-xs text-zinc-400">{fmtDate(f.created_at)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{f.message}</p>
          <div className="mt-2 text-xs text-zinc-500">
            {f.name || "—"}
            {f.email ? ` · ${f.email}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- shared ---------- */
function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="truncate font-medium text-zinc-700">{value}</dd>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const color =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
      ? "text-amber-600"
      : "text-zinc-900";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-xl font-bold sm:text-2xl ${color}`}>{value}</div>
    </div>
  );
}
