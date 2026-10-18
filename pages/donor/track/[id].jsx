import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { explorerTxUrl } from "@/utils/chain";

const STAGES = [
  { num: 1, emoji: "⏳", title: "Pending", desc: "Donation initiated" },
  { num: 2, emoji: "✅", title: "Confirmed", desc: "Payment confirmed by the NGO" },
  { num: 3, emoji: "📋", title: "Allocated", desc: "NGO assigned the funds to a cause" },
  { num: 4, emoji: "💸", title: "Transferred", desc: "Funds sent to the beneficiary" },
  { num: 5, emoji: "🌟", title: "Completed", desc: "Impact delivered" },
];

// Proof the NGO uploaded on the beneficiary's own payout timeline.
const BEN_PROOF_LABEL = { 4: "Transfer receipt", 5: "Delivery proof" };

function isPdf(url) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function ProofLink({ url, label }) {
  if (!url) return null;
  return isPdf(url) ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline"
    >
      📄 {label}
    </a>
  ) : (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt={label}
        className="mt-2 max-h-56 w-full rounded-lg border border-emerald-200 object-cover"
      />
    </a>
  );
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// The donation's share of each spending record from the NGO's cause pool.
function WhereMoneyWent({ donation, allocations }) {
  const net = Number(donation.net_amount ?? donation.amount);
  const used = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  const fee = Number(donation.amount) - net;
  const pct = net > 0 ? Math.min(100, (used / net) * 100) : 0;
  const people = allocations.filter((a) => a.expense?.request).length;

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900">Where your money went</h2>
      <p className="text-xs text-zinc-500">
        Your donation joined the NGO&apos;s {donation.donation_type} pool. Each line is your share
        of a spending record, backed by its receipt.
        {people > 0 && ` It reached ${people} ${people === 1 ? "person" : "people"} directly.`}
      </p>

      <ul className="mt-4 divide-y divide-zinc-100">
        {allocations.map((a) => {
          const e = a.expense || {};
          return (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">
                  {e.request ? `Payout to ${e.request.beneficiary_name}` : e.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {e.request && `${e.title} · `}
                  {money(e.amount)} total · {fmtDate(e.spent_on)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-semibold">
                  {e.receipt_url && (
                    <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                      Receipt
                    </a>
                  )}
                  {e.delivery_proof_url && (
                    <a href={e.delivery_proof_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                      Delivery proof
                    </a>
                  )}
                  {e.status === "completed" ? (
                    <span className="text-emerald-600">✓ Delivered</span>
                  ) : (
                    <span className="text-zinc-400">Delivery pending</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{money(a.amount)}</p>
                <p className="text-xs text-zinc-500">your share</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 border-t border-zinc-200 pt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-zinc-800">
          {money(used)} of {money(net)} accounted for {used >= net - 0.005 ? "✅" : ""}
        </p>
        {fee > 0.005 && (
          <p className="text-xs text-zinc-500">
            {money(donation.amount)} donated − {money(fee)} card processing fee paid by the NGO.
          </p>
        )}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

export default function TrackDonation() {
  const router = useRouter();
  const { id } = router.query;
  const [donation, setDonation] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [beneficiaryRequest, setBeneficiaryRequest] = useState(null);
  const [beneficiaryUpdates, setBeneficiaryUpdates] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: don } = await supabase
        .from("donations")
        .select("*, campaign:campaigns(title)")
        .eq("id", id)
        .maybeSingle();
      let ups = [];
      let benReq = null;
      let benUps = [];
      let allocs = [];
      if (don) {
        const promises = [
          supabase
            .from("donation_updates")
            .select("*")
            .eq("donation_id", id)
            .order("stage", { ascending: true }),
          supabase
            .from("donation_allocations")
            .select(
              "id, amount, created_at, expense:ngo_expenses(title, cause, amount, receipt_url, delivery_proof_url, status, spent_on, request:beneficiary_requests(beneficiary_name))"
            )
            .eq("donation_id", id)
            .order("created_at", { ascending: true }),
        ];
        if (don.beneficiary_request_id) {
          promises.push(
            supabase
              .from("beneficiary_requests")
              .select("beneficiary_name, reason, amount")
              .eq("id", don.beneficiary_request_id)
              .maybeSingle(),
            supabase
              .from("beneficiary_request_updates")
              .select("*")
              .eq("request_id", don.beneficiary_request_id)
              .order("stage", { ascending: true })
          );
        }
        const results = await Promise.all(promises);
        ups = results[0].data || [];
        allocs = results[1].data || [];
        if (don.beneficiary_request_id) {
          benReq = results[2].data || null;
          benUps = results[3].data || [];
        }
      }
      if (active) {
        setDonation(don || null);
        setUpdates(ups);
        setBeneficiaryRequest(benReq);
        setBeneficiaryUpdates(benUps);
        setAllocations(allocs);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const currentStage = donation?.stage || 0;

  return (
    <>
      <Head>
        <title>Track Donation · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/donor/dashboard" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              ← Back to dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}

          {!loading && !donation && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <div className="text-4xl">🔍</div>
              <h1 className="mt-3 text-lg font-bold text-zinc-900">Donation not found</h1>
              <p className="mt-1 text-sm text-zinc-600">
                This donation doesn't exist or you don't have access to it.
              </p>
            </div>
          )}

          {!loading && donation && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Donation to</p>
                    <h1 className="mt-1 text-lg font-bold text-zinc-900 sm:text-xl">
                      {donation.ngo_name}
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500">{donation.donation_type}</p>
                    {donation.campaign && (
                      <p className="mt-0.5 text-sm font-medium text-emerald-700">
                        📣 Campaign: {donation.campaign.title}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Amount</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">${donation.amount}</p>
                  </div>
                </div>
                <p className="mt-3 break-all font-mono text-xs text-zinc-400">ID: {donation.id}</p>

                {donation.tx_hash && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⛓️</span>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Verified on the blockchain
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      This donation was paid on-chain. The record below is public and permanent —
                      neither the NGO nor DonateLink can alter it.
                    </p>
                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-zinc-500">Transaction</dt>
                        <dd className="break-all font-mono text-zinc-800">{donation.tx_hash}</dd>
                      </div>
                      {donation.from_address && (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-zinc-500">From wallet</dt>
                          <dd className="break-all font-mono text-zinc-800">
                            {donation.from_address}
                          </dd>
                        </div>
                      )}
                      {donation.onchain_donation_id != null && (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-zinc-500">On-chain ID</dt>
                          <dd className="font-mono text-zinc-800">
                            #{donation.onchain_donation_id}
                          </dd>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-zinc-500">Network</dt>
                        <dd className="text-zinc-800">Polygon Amoy</dd>
                      </div>
                    </dl>
                    <a
                      href={explorerTxUrl(donation.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs font-semibold text-emerald-700 underline hover:text-emerald-800"
                    >
                      Verify on PolygonScan →
                    </a>
                  </div>
                )}

                {donation.payment_method === "stripe" && donation.payment_status === "paid" && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💳</span>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Paid by card · Stripe
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      Your card payment was confirmed by Stripe and paid straight to{" "}
                      {donation.ngo_name}&apos;s own Stripe account — DonateLink never held the funds.
                    </p>
                    {donation.stripe_payment_intent && (
                      <dl className="mt-3 space-y-1.5 text-xs">
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-zinc-500">Payment reference</dt>
                          <dd className="break-all font-mono text-zinc-800">
                            {donation.stripe_payment_intent}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                )}

                {donation.payment_status === "pending" && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    This card payment has not been completed yet. It will move to Stage 2 as soon as
                    Stripe confirms it.
                  </div>
                )}

                {donation.payment_status === "failed" && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    The card payment for this donation was not completed, so you were not charged.
                    You can safely donate again.
                  </div>
                )}

                {donation.onchain_status === "failed" && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    The on-chain transaction for this donation did not go through, so no funds were
                    sent. You can safely donate again.
                  </div>
                )}
              </div>

              {allocations.length > 0 && (
                <WhereMoneyWent donation={donation} allocations={allocations} />
              )}

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
                <h2 className="text-base font-semibold text-zinc-900">Lifecycle & Proof</h2>
                <p className="text-xs text-zinc-500">
                  Follow your donation through all 5 stages with proof of impact.
                </p>
                <ol className="mt-6 space-y-5">
                  {STAGES.map((s) => {
                    const reached = s.num <= currentStage;
                    const current = s.num === currentStage;
                    const update = updates.find((u) => u.stage === s.num);
                    return (
                      <li key={s.num} className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                            reached ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                          }`}
                        >
                          {s.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${reached ? "text-zinc-900" : "text-zinc-400"}`}>
                              Stage {s.num} — {s.title}
                            </h3>
                            {current && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                Current
                              </span>
                            )}
                          </div>
                          <p className={`mt-0.5 text-sm ${reached ? "text-zinc-600" : "text-zinc-400"}`}>
                            {s.desc}
                          </p>

                          {s.num === 4 && reached && beneficiaryRequest && (
                            <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                This helped
                              </div>
                              <div className="mt-1 font-semibold text-zinc-900">
                                {beneficiaryRequest.beneficiary_name}
                              </div>
                              <p className="mt-1 text-sm text-emerald-900 line-clamp-4">
                                {beneficiaryRequest.reason}
                              </p>

                              {beneficiaryUpdates.some(
                                (u) => u.proof_url && BEN_PROOF_LABEL[u.stage]
                              ) && (
                                <div className="mt-3 border-t border-emerald-300 pt-3">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                    Proof the NGO paid the beneficiary
                                  </div>
                                  {beneficiaryUpdates
                                    .filter((u) => u.proof_url && BEN_PROOF_LABEL[u.stage])
                                    .map((u) => (
                                      <div key={u.id} className="mt-2">
                                        <p className="text-sm font-medium text-emerald-900">
                                          {BEN_PROOF_LABEL[u.stage]}
                                        </p>
                                        {u.note && (
                                          <p className="text-sm text-emerald-800">{u.note}</p>
                                        )}
                                        <ProofLink
                                          url={u.proof_url}
                                          label={`View ${BEN_PROOF_LABEL[u.stage].toLowerCase()}`}
                                        />
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                          {update && (update.note || update.proof_url) && (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                              {update.note && (
                                <p className="text-sm text-emerald-800">{update.note}</p>
                              )}
                              {update.proof_url &&
                                (isPdf(update.proof_url) ? (
                                  <a
                                    href={update.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline"
                                  >
                                    📄 View proof document
                                  </a>
                                ) : (
                                  <a
                                    href={update.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={update.proof_url}
                                      alt={`Proof for stage ${s.num}`}
                                      className="mt-2 max-h-56 w-full rounded-lg border border-emerald-200 object-cover"
                                    />
                                  </a>
                                ))}
                              {update.created_at && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  Updated {fmtDate(update.created_at)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
