import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

export default function RatingModal({ open, ngo, existing, role, onClose, onSaved }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setStars(existing?.stars || 0);
    setReview(existing?.review || "");
    setHover(0);
    setSaving(false);
    setErrorMsg("");
  }, [open, existing]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ngo) return null;

  async function handleSave() {
    if (stars < 1) {
      setErrorMsg("Please pick a star rating.");
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Please sign in.");
      setSaving(false);
      return;
    }

    const reviewerName = user.user_metadata?.name || user.email;

    const { error } = await supabase
      .from("ngo_ratings")
      .upsert(
        {
          ngo_id: ngo.id,
          user_id: user.id,
          stars,
          review: review.trim() || null,
          reviewer_name: reviewerName,
          reviewer_role: role || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ngo_id,user_id" }
      );

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (onSaved) onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              Rate <span className="text-emerald-700">{ngo.org_name}</span>
            </h2>
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

        <div className="space-y-4 px-6 py-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-zinc-700">Your rating</div>
            <div className="mt-2 flex items-center gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || stars) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className={`transition ${active ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"}`}
                    aria-label={`${n} stars`}
                  >
                    ★
                  </button>
                );
              })}
              {stars > 0 && (
                <span className="ml-2 text-sm font-semibold text-zinc-700">{stars}/5</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="review" className="block text-sm font-medium text-zinc-700">
              Your review <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="review"
              rows={4}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this NGO."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {existing && (
            <p className="text-xs text-zinc-500">
              You already rated this NGO — saving will update your rating.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:enabled:border-zinc-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || stars < 1}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : existing ? "Update Rating" : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
