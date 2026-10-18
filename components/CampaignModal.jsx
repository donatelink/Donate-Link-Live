import { useEffect, useState } from "react";
import { CAUSE_NAMES } from "@/components/DonationModal";
import supabase from "@/utils/supabase";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

// NGO starts a fundraising campaign: a goal for one cause. It closes by itself
// once paid donations reach the goal.
export default function CampaignModal({ open, ngo, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [cause, setCause] = useState(CAUSE_NAMES[0]);
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setCause(CAUSE_NAMES[0]);
    setGoal("");
    setDescription("");
    setSaving(false);
    setErrorMsg("");
  }, [open]);

  if (!open || !ngo) return null;

  async function handleSave() {
    setErrorMsg("");
    if (!title.trim()) return setErrorMsg("Give the campaign a title.");
    if (!(Number(goal) >= 1)) return setErrorMsg("Set a goal of at least $1.");
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      ngo_id: ngo.id,
      title: title.trim(),
      cause,
      goal: Number(goal),
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) return setErrorMsg(error.message);
    if (onSaved) onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">New campaign</h2>
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
          <p className="mt-1 text-sm text-zinc-600">
            Ask donors for a set amount. The campaign closes by itself once the goal is raised, and
            its money can only be spent on this campaign.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="c_title" className="block text-sm font-medium text-zinc-700">
              Title
            </label>
            <input
              id="c_title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. School supplies for 200 children"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c_cause" className="block text-sm font-medium text-zinc-700">
                Cause
              </label>
              <select id="c_cause" value={cause} onChange={(e) => setCause(e.target.value)} className={inputClass}>
                {CAUSE_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c_goal" className="block text-sm font-medium text-zinc-700">
                Goal (USD)
              </label>
              <input
                id="c_goal"
                type="number"
                min="1"
                step="1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="5000"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="c_desc" className="block text-sm font-medium text-zinc-700">
              Description <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="c_desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the money will be used for and who it helps."
              className={inputClass}
            />
          </div>
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
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
