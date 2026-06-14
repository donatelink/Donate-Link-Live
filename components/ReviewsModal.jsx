import { useEffect, useState } from "react";
import StarRating from "@/components/StarRating";
import supabase from "@/utils/supabase";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

export default function ReviewsModal({ open, ngo, onClose }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open || !ngo) return;
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase
        .from("ngo_ratings")
        .select("*")
        .eq("ngo_id", ngo.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setErrorMsg(error.message);
      setReviews(data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, ngo]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ngo) return null;

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.stars, 0) / count : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-900">
                Reviews · <span className="text-emerald-700">{ngo.org_name}</span>
              </h2>
              <div className="mt-1">
                <StarRating value={avg} size="md" count={count} showNumber={count > 0} />
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {errorMsg && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading && <p className="text-sm text-zinc-500">Loading reviews…</p>}

          {!loading && reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
              No reviews yet. Be the first to review this NGO after donating or getting funded.
            </div>
          )}

          {!loading && reviews.length > 0 && (
            <ul className="divide-y divide-zinc-100">
              {reviews.map((r) => (
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
          )}
        </div>

        <div className="flex items-center justify-end border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
