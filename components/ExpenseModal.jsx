import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// Mirrors the eligibility rule in supabase/cause_pools.sql: a donation joins its
// cause pool once it is paid and confirmed (Stage 2+), unless it was advanced by
// hand before pools existed.
export function computePools(donations) {
  const pools = {};
  for (const d of donations) {
    const paid =
      (d.payment_status == null || d.payment_status === "paid") &&
      (d.onchain_status == null || d.onchain_status === "confirmed");
    if (d.stage < 2 || d.manual_stages || !paid) continue;
    const net = Number(d.net_amount ?? d.amount);
    const p = (pools[d.donation_type] ||= { cause: d.donation_type, received: 0, spent: 0, count: 0 });
    p.received += net;
    p.spent += Number(d.allocated_amount || 0);
    p.count += 1;
  }
  return Object.values(pools)
    .map((p) => ({ ...p, available: Math.round((p.received - p.spent) * 100) / 100 }))
    .sort((a, b) => b.available - a.available);
}

async function uploadProof(ngoId, file, kind) {
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const path = `expenses/${ngoId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
}

function Shell({ title, subtitle, onClose, children, footer }) {
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
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
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
          {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function FilePicker({ file, setFile, label }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">
        {label} <span className="text-red-500">* required</span>
      </label>
      <label
        className={`mt-1 flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-4 text-sm hover:border-emerald-400 hover:bg-emerald-50 ${
          file ? "border-zinc-300 text-zinc-500" : "border-red-300 text-red-500"
        }`}
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        {file ? (
          <span className="font-medium text-emerald-700">📎 {file.name}</span>
        ) : (
          <span>📤 Click to upload a receipt, photo, or document</span>
        )}
      </label>
    </div>
  );
}

// Record one spending entry from a cause pool. The database splits it across
// the pool's donations; this form only collects what was spent and the receipt.
export default function ExpenseModal({ open, ngo, pools, requests, preselectRequest, onClose, onSaved }) {
  const [cause, setCause] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [requestId, setRequestId] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const req = preselectRequest || null;
    setCause(pools.find((p) => p.available > 0)?.cause || "");
    setRequestId(req?.id || "");
    setTitle(req ? `Payout to ${req.beneficiary_name}` : "");
    setAmount(req ? String(req.amount) : "");
    setSpentOn(new Date().toISOString().slice(0, 10));
    setFile(null);
    setSaving(false);
    setErrorMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the modal opens
  }, [open, preselectRequest]);

  if (!open || !ngo) return null;

  const pool = pools.find((p) => p.cause === cause);
  const request = requests.find((r) => r.id === requestId);
  const value = request ? Number(request.amount) : Number(amount);
  const short = pool && value > pool.available;

  function pickRequest(id) {
    setRequestId(id);
    const r = requests.find((x) => x.id === id);
    if (r) {
      setAmount(String(r.amount));
      if (!title || title.startsWith("Payout to ")) setTitle(`Payout to ${r.beneficiary_name}`);
    }
  }

  async function handleSave() {
    setErrorMsg("");
    if (!cause) return setErrorMsg("Choose the cause pool this was paid from.");
    if (!title.trim()) return setErrorMsg("Describe what the money was spent on.");
    if (!(value > 0)) return setErrorMsg("Enter the amount spent.");
    if (short) return setErrorMsg(`The ${cause} pool only has ${money(pool.available)} available.`);
    if (!file) return setErrorMsg("Attach the receipt for this spending.");

    setSaving(true);
    try {
      const receiptUrl = await uploadProof(ngo.id, file, "receipt");
      const { error } = await supabase.from("ngo_expenses").insert({
        ngo_id: ngo.id,
        cause,
        title: title.trim(),
        amount: value,
        beneficiary_request_id: requestId || null,
        receipt_url: receiptUrl,
        spent_on: spentOn || undefined,
      });
      if (error) throw new Error(error.message);
      setSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
      setSaving(false);
    }
  }

  const fundable = pools.filter((p) => p.available > 0);

  return (
    <Shell
      title="Record spending"
      subtitle="One entry with one receipt. DonateLink splits it across the pool's donations automatically, oldest first."
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:enabled:border-zinc-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || fundable.length === 0}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Record spending"}
          </button>
        </>
      }
    >
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {fundable.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
          No cause pool has money available yet. Pools fill as donations are paid.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="cause" className="block text-sm font-medium text-zinc-700">
              Paid from pool
            </label>
            <select id="cause" value={cause} onChange={(e) => setCause(e.target.value)} className={inputClass}>
              {fundable.map((p) => (
                <option key={p.cause} value={p.cause}>
                  {p.cause} · {money(p.available)} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="request" className="block text-sm font-medium text-zinc-700">
              Pay a beneficiary request? <span className="text-zinc-400">(optional)</span>
            </label>
            <select id="request" value={requestId} onChange={(e) => pickRequest(e.target.value)} className={inputClass}>
              <option value="">— No, general spending —</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.beneficiary_name} · {money(r.amount)}
                </option>
              ))}
            </select>
            {requestId && (
              <p className="mt-1 text-xs text-zinc-500">
                This receipt also becomes the beneficiary&apos;s Stage 4 transfer proof.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
              What was it spent on?
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. School supplies for 200 children"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-zinc-700">
                Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                disabled={!!requestId}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-zinc-50`}
              />
            </div>
            <div>
              <label htmlFor="spentOn" className="block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                id="spentOn"
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {short && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The {cause} pool only has {money(pool.available)} available.
            </p>
          )}

          <FilePicker file={file} setFile={setFile} label="Receipt (bank slip, invoice or transaction receipt)" />
        </>
      )}
    </Shell>
  );
}

// Upload delivery proof for general spending; donations it used move to Stage 5
// once everything they funded is delivered.
export function DeliverModal({ open, ngo, expense, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setFile(null);
      setSaving(false);
      setErrorMsg("");
    }
  }, [open]);

  if (!open || !expense) return null;

  async function handleSave() {
    setErrorMsg("");
    if (!file) return setErrorMsg("Attach a delivery photo or document.");
    setSaving(true);
    try {
      const proofUrl = await uploadProof(ngo.id, file, "delivery");
      const { error } = await supabase.rpc("complete_expense", {
        p_expense: expense.id,
        p_proof_url: proofUrl,
      });
      if (error) throw new Error(error.message);
      setSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
      setSaving(false);
    }
  }

  return (
    <Shell
      title="Mark delivered"
      subtitle={`${expense.title} · ${money(expense.amount)}`}
      onClose={onClose}
      footer={
        <>
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
            {saving ? "Saving..." : "Mark delivered"}
          </button>
        </>
      }
    >
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <p className="text-sm text-zinc-600">
        Show that what was bought actually reached people. Donations that funded this move to Stage
        5 once everything they paid for is delivered.
      </p>
      <FilePicker file={file} setFile={setFile} label="Delivery proof (photo or document)" />
    </Shell>
  );
}
