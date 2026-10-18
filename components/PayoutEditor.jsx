import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// What the NGO actually received for a donation (card: after the Stripe fee).
export function assignable(donation) {
  return Number(donation.net_amount ?? donation.amount);
}

// Totals from the NGO's payout rows: given per donation, received per request.
export function payoutTotals(payouts) {
  const byDonation = {};
  const byRequest = {};
  for (const p of payouts) {
    byDonation[p.donation_id] = round2((byDonation[p.donation_id] || 0) + Number(p.amount));
    byRequest[p.beneficiary_request_id] = round2((byRequest[p.beneficiary_request_id] || 0) + Number(p.amount));
  }
  return { byDonation, byRequest };
}

// Verified beneficiaries who still need money, with how much is left for each.
export function openRequests(requests, byRequest) {
  return requests
    .filter((r) => r.status === "verified")
    .map((r) => ({ ...r, needs: round2(Number(r.amount) - (byRequest[r.id] || 0)) }))
    .filter((r) => r.needs > 0);
}

export function emptyRow() {
  return { requestId: "", amount: "", file: null };
}

// Checks rows against what is left of the donation and what each person needs.
// The database repeats these checks; this gives the NGO a clear message first.
export function validateRows(rows, left, options) {
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const perRequest = {};
  for (const r of rows) {
    if (!r.requestId) return "Choose a beneficiary for every row.";
    if (!(Number(r.amount) > 0)) return "Enter an amount for every beneficiary.";
    if (!r.file) return "Attach the transfer receipt for every beneficiary.";
    perRequest[r.requestId] = (perRequest[r.requestId] || 0) + Number(r.amount);
  }
  if (round2(total) > left) return `Only ${money(left)} of this donation is left to give.`;
  for (const [id, amt] of Object.entries(perRequest)) {
    const req = options.find((o) => o.id === id);
    if (req && round2(amt) > req.needs) return `${req.beneficiary_name} only needs ${money(req.needs)} more.`;
  }
  return null;
}

// Uploads each receipt and saves all payouts in one insert, so either every
// row is saved or none is.
export async function savePayouts(donation, rows) {
  const records = [];
  for (const r of rows) {
    const ext = (r.file.name.split(".").pop() || "dat").toLowerCase();
    const path = `${donation.id}/payout-${Date.now()}-${records.length}.${ext}`;
    const { error } = await supabase.storage.from("proofs").upload(path, r.file, { upsert: false });
    if (error) throw new Error(`Receipt upload failed: ${error.message}`);
    records.push({
      donation_id: donation.id,
      beneficiary_request_id: r.requestId,
      ngo_id: donation.ngo_id,
      amount: Number(r.amount),
      receipt_url: supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl,
    });
  }
  const { error } = await supabase.from("donation_payouts").insert(records);
  if (error) throw new Error(error.message);
}

// Rows of "beneficiary + amount + receipt" with a running "$X left" counter.
export function PayoutRows({ rows, setRows, options, left }) {
  const used = round2(rows.reduce((s, r) => s + Number(r.amount || 0), 0));
  const remaining = round2(left - used);

  function update(i, patch) {
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function pick(i, requestId) {
    const req = options.find((o) => o.id === requestId);
    const others = round2(rows.reduce((s, r, j) => (j === i ? s : s + Number(r.amount || 0)), 0));
    const suggest = req ? Math.min(req.needs, round2(left - others)) : "";
    update(i, { requestId, amount: suggest > 0 ? String(suggest) : "" });
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 p-3">
          <div className="flex gap-2">
            <select value={r.requestId} onChange={(e) => pick(i, e.target.value)} className={inputClass}>
              <option value="">— Choose beneficiary —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.beneficiary_name} · needs {money(o.needs)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              aria-label="Remove"
              className="shrink-0 rounded-lg border border-zinc-300 px-2 text-zinc-500 hover:border-red-300 hover:text-red-600"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={r.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
                placeholder="Amount"
                className={`${inputClass} pl-6`}
              />
            </div>
            <label
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-2 text-xs hover:border-emerald-400 hover:bg-emerald-50 ${
                r.file ? "border-zinc-300 text-emerald-700" : "border-red-300 text-red-500"
              }`}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => update(i, { file: e.target.files?.[0] || null })}
                className="hidden"
              />
              {r.file ? `📎 ${r.file.name}` : "📤 Transfer receipt *"}
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRows([...rows, emptyRow()])}
          disabled={options.length === 0 || remaining <= 0}
          className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:enabled:bg-emerald-50 disabled:opacity-40"
        >
          + Add beneficiary
        </button>
        <span className={`text-xs font-semibold ${remaining < 0 ? "text-red-600" : "text-zinc-600"}`}>
          {money(used)} of {money(left)} assigned · {money(Math.max(0, remaining))} left
        </span>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-zinc-500">No verified beneficiaries are waiting for money right now.</p>
      )}
    </div>
  );
}

// "Assign remaining": give the rest of an already-transferred donation.
export function AssignPayoutModal({ open, donation, left, options, onClose, onSaved }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setRows([emptyRow()]);
      setSaving(false);
      setErrorMsg("");
    }
  }, [open]);

  if (!open || !donation) return null;

  async function handleSave() {
    setErrorMsg("");
    if (rows.length === 0) return setErrorMsg("Add at least one beneficiary.");
    const problem = validateRows(rows, left, options);
    if (problem) return setErrorMsg(problem);
    setSaving(true);
    try {
      await savePayouts(donation, rows);
      setSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
      setSaving(false);
    }
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
          <h2 className="text-base font-semibold text-zinc-900">Give remaining to beneficiaries</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {money(left)} of {donation.donor_name}&apos;s donation has not been given yet.
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <PayoutRows rows={rows} setRows={setRows} options={options} left={left} />
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
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
