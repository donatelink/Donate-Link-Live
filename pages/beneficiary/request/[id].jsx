import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

const STAGES = [
  { num: 1, emoji: "⏳", title: "Pending", desc: "Request submitted, awaiting NGO" },
  { num: 2, emoji: "✅", title: "Confirmed", desc: "NGO confirmed your request" },
  { num: 3, emoji: "📋", title: "Allocated", desc: "Funds set aside for you" },
  { num: 4, emoji: "💸", title: "Transferred", desc: "Funds transferred to you" },
  { num: 5, emoji: "🌟", title: "Completed", desc: "Funding complete" },
];

function isPdf(url) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

export default function TrackRequest() {
  const router = useRouter();
  const { id } = router.query;
  const [request, setRequest] = useState(null);
  const [ngo, setNgo] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: req } = await supabase
        .from("beneficiary_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      let ngoRow = null;
      let ups = [];
      if (req) {
        const [n, u] = await Promise.all([
          supabase.from("ngos").select("*").eq("id", req.ngo_id).maybeSingle(),
          supabase
            .from("beneficiary_request_updates")
            .select("*")
            .eq("request_id", req.id)
            .order("stage", { ascending: true }),
        ]);
        ngoRow = n.data;
        ups = u.data || [];
      }
      if (active) {
        setRequest(req || null);
        setNgo(ngoRow);
        setUpdates(ups);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const currentStage = request?.stage || 0;
  const rejected = request?.status === "rejected";
  const pending = request?.status === "pending";

  return (
    <>
      <Head>
        <title>Track Request · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link
              href="/beneficiary/dashboard"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              ← Back to dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}

          {!loading && !request && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <div className="text-4xl">🔍</div>
              <h1 className="mt-3 text-lg font-bold text-zinc-900">Request not found</h1>
              <p className="mt-1 text-sm text-zinc-600">
                This request doesn't exist or you don't have access to it.
              </p>
            </div>
          )}

          {!loading && request && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Request to</p>
                    <h1 className="mt-1 text-lg font-bold text-zinc-900 sm:text-xl">
                      {request.ngo_name}
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      Submitted {fmtDate(request.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Asked for</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">${request.amount}</p>
                  </div>
                </div>
              </div>

              {rejected && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-red-800">Request rejected</h2>
                  {request.ngo_note && (
                    <p className="mt-2 text-sm text-red-700">{request.ngo_note}</p>
                  )}
                  <p className="mt-3 text-xs text-red-700">
                    You can submit a new request to a different NGO next month.
                  </p>
                </div>
              )}

              {!rejected && (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-zinc-900">Lifecycle & Proof</h2>
                  <p className="text-xs text-zinc-500">
                    Follow your request through all 5 stages with proof of every step.
                  </p>

                  {pending && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Awaiting NGO verification. Once verified, the NGO will start advancing the
                      stages and contact you.
                    </div>
                  )}

                  <ol className="mt-6 space-y-5">
                    {STAGES.map((s) => {
                      const reached = !pending && s.num <= currentStage;
                      const current = !pending && s.num === currentStage;
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
                              <h3
                                className={`font-semibold ${
                                  reached ? "text-zinc-900" : "text-zinc-400"
                                }`}
                              >
                                Stage {s.num} — {s.title}
                              </h3>
                              {current && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                  Current
                                </span>
                              )}
                            </div>
                            <p
                              className={`mt-0.5 text-sm ${
                                reached ? "text-zinc-600" : "text-zinc-400"
                              }`}
                            >
                              {s.desc}
                            </p>

                            {s.num === 2 && reached && ngo && (
                              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                <div className="font-semibold">The NGO will contact you at:</div>
                                <div className="mt-1">{request.beneficiary_email}</div>
                                <div className="mt-2 text-xs">
                                  NGO contact: {ngo.contact_person} · {ngo.phone} · {ngo.email}
                                </div>
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
              )}

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
                <h2 className="text-base font-semibold text-zinc-900">Your story</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{request.reason}</p>

                {request.proof_url && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-zinc-500">Attached proof</div>
                    {isPdf(request.proof_url) ? (
                      <a
                        href={request.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline"
                      >
                        📄 View document
                      </a>
                    ) : (
                      <a href={request.proof_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={request.proof_url}
                          alt="Proof"
                          className="mt-2 max-h-56 w-full rounded-lg border border-zinc-200 object-cover"
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
