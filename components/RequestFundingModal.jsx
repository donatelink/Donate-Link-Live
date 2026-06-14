import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

export default function RequestFundingModal({ open, ngo, onClose, onSubmitted }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setReason("");
    setFile(null);
    setSaving(false);
    setErrorMsg("");
    setDone(false);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ngo) return null;

  async function handleSubmit() {
    setSaving(true);
    setErrorMsg("");

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Enter a valid amount.");
      setSaving(false);
      return;
    }
    if (!reason.trim() || reason.trim().length < 20) {
      setErrorMsg("Please describe your situation in at least 20 characters.");
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Please sign in as a beneficiary.");
      setSaving(false);
      return;
    }

    // Enforce: no active request AND no request submitted this calendar month.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: existing, error: chkErr } = await supabase
      .from("beneficiary_requests")
      .select("id, status, created_at")
      .eq("beneficiary_id", user.id);

    if (chkErr) {
      setErrorMsg(chkErr.message);
      setSaving(false);
      return;
    }

    const hasActive = (existing || []).some((r) =>
      ["pending", "verified"].includes(r.status)
    );
    if (hasActive) {
      setErrorMsg("You already have an active request. Wait for it to complete first.");
      setSaving(false);
      return;
    }
    const thisMonth = (existing || []).some(
      (r) => new Date(r.created_at) >= startOfMonth
    );
    if (thisMonth) {
      setErrorMsg("You've already submitted a request this month. Try again next month.");
      setSaving(false);
      return;
    }

    let proofUrl = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "dat").toLowerCase();
      const path = `beneficiary/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("proofs")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setErrorMsg(`Proof upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }
      proofUrl = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
    }

    const { error: insErr } = await supabase.from("beneficiary_requests").insert({
      beneficiary_id: user.id,
      ngo_id: ngo.id,
      amount: amt,
      reason: reason.trim(),
      proof_url: proofUrl,
      beneficiary_name: user.user_metadata?.name || user.email,
      beneficiary_email: user.email,
      ngo_name: ngo.org_name,
    });

    if (insErr) {
      setErrorMsg(insErr.message);
      setSaving(false);
      return;
    }

    setDone(true);
    setSaving(false);
    if (onSubmitted) onSubmitted();
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
        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-900">Request submitted</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your request to <span className="font-semibold">{ngo.org_name}</span> is now pending
              review. They will contact you once verified.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">
                  Request funding from <span className="text-emerald-700">{ngo.org_name}</span>
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
                <label htmlFor="amount" className="block text-sm font-medium text-zinc-700">
                  Amount needed (USD)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                  <input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full rounded-lg border border-zinc-300 py-2 pl-7 pr-3 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-zinc-700">
                  Your situation
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe what you need help with and why."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Proof / documents <span className="text-zinc-400">(optional)</span>
                </label>
                <label className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 hover:border-emerald-400 hover:bg-emerald-50">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {file ? (
                    <span className="font-medium text-emerald-700">📎 {file.name}</span>
                  ) : (
                    <span>📤 Click to upload an ID, photo, or document</span>
                  )}
                </label>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                You can only request from one NGO per month.
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
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
