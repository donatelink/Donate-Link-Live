import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

const STAGES = ["Pending", "Confirmed", "Allocated", "Transferred", "Completed"];

const DONATION_DESC = {
  2: "Confirm you have received this donation.",
  3: "You've allocated the funds to a specific cause.",
  4: "Funds have been transferred to the beneficiary.",
  5: "Impact delivered — share the final proof of completion.",
};

const BENEFICIARY_DESC = {
  2: "You've confirmed the request and set aside funds.",
  3: "Funds allocated specifically for this beneficiary.",
  4: "Funds physically transferred to the beneficiary.",
  5: "Funding complete — share the final proof of delivery.",
};

// Stage-specific proof labels. Stages 4 (transfer) and 5 (delivery) require proof.
const PROOF_LABEL = {
  4: "Proof of transfer (bank slip / transaction receipt)",
  5: "Proof of delivery (photo or document)",
};
function proofLabelFor(stage) {
  return PROOF_LABEL[stage] || "Proof of impact";
}

export default function StageAdvanceModal({
  open,
  record,
  kind = "donation",
  verifiedRequests = [],
  onClose,
  onAdvanced,
}) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [beneficiaryRequestId, setBeneficiaryRequestId] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
      setFile(null);
      setSaving(false);
      setErrorMsg("");
      setBeneficiaryRequestId("");
    }
  }, [open]);

  if (!open || !record) return null;

  const isBeneficiary = kind === "beneficiary";
  const nextStage = record.stage + 1;
  const nextLabel = STAGES[nextStage - 1];
  const stageDesc = isBeneficiary ? BENEFICIARY_DESC[nextStage] : DONATION_DESC[nextStage];
  const proofRequired = nextStage === 4 || nextStage === 5;

  async function handleSave() {
    setErrorMsg("");

    if (proofRequired && !file) {
      setErrorMsg("Please attach the required proof to advance to this stage.");
      return;
    }

    setSaving(true);

    let proofUrl = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "dat").toLowerCase();
      const folder = isBeneficiary ? `beneficiary/${record.id}` : record.id;
      const path = `${folder}/stage${nextStage}-${Date.now()}.${ext}`;
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

    if (isBeneficiary) {
      const { error: insErr } = await supabase
        .from("beneficiary_request_updates")
        .insert({
          request_id: record.id,
          stage: nextStage,
          note: note.trim() || null,
          proof_url: proofUrl,
        });
      if (insErr) {
        setErrorMsg(insErr.message);
        setSaving(false);
        return;
      }

      const update = {
        stage: nextStage,
        updated_at: new Date().toISOString(),
      };
      if (nextStage === 5) update.status = "funded";

      const { error: stageErr } = await supabase
        .from("beneficiary_requests")
        .update(update)
        .eq("id", record.id);
      if (stageErr) {
        setErrorMsg(stageErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase.from("donation_updates").insert({
        donation_id: record.id,
        stage: nextStage,
        note: note.trim() || null,
        proof_url: proofUrl,
      });
      if (insErr) {
        setErrorMsg(insErr.message);
        setSaving(false);
        return;
      }

      const donationUpdate = {
        stage: nextStage,
        note: note.trim() || record.note,
        updated_at: new Date().toISOString(),
      };
      if (nextStage === 4 && beneficiaryRequestId) {
        donationUpdate.beneficiary_request_id = beneficiaryRequestId;
      }

      const { error: stageErr } = await supabase
        .from("donations")
        .update(donationUpdate)
        .eq("id", record.id);
      if (stageErr) {
        setErrorMsg(stageErr.message);
        setSaving(false);
        return;
      }

      if (nextStage === 4 && beneficiaryRequestId) {
        const { error: reqErr } = await supabase
          .from("beneficiary_requests")
          .update({ status: "funded", updated_at: new Date().toISOString() })
          .eq("id", beneficiaryRequestId);
        if (reqErr) {
          setErrorMsg(`Donation advanced, but failed to mark request funded: ${reqErr.message}`);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    if (onAdvanced) onAdvanced();
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
              Advance to Stage {nextStage}
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
          <p className="mt-1 text-sm text-emerald-700">
            <span className="font-semibold">{nextLabel}</span> — {stageDesc}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {isBeneficiary ? (
              <>
                Payout: <span className="font-semibold text-zinc-800">${record.amount}</span> to{" "}
                <span className="font-semibold text-zinc-800">{record.beneficiary_name}</span>
              </>
            ) : (
              <>
                Donation: <span className="font-semibold text-zinc-800">${record.amount}</span> from{" "}
                <span className="font-semibold text-zinc-800">{record.donor_name}</span>
              </>
            )}
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-zinc-700">
              Update note {isBeneficiary ? "for the beneficiary" : "for the donor"}
            </label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isBeneficiary
                  ? "Tell the beneficiary what happened at this stage."
                  : "Tell the donor what happened at this stage."
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {!isBeneficiary && nextStage === 4 && (
            <div>
              <label htmlFor="beneficiaryRequest" className="block text-sm font-medium text-zinc-700">
                Link to a beneficiary payout? <span className="text-zinc-400">(optional)</span>
              </label>
              <select
                id="beneficiaryRequest"
                value={beneficiaryRequestId}
                onChange={(e) => setBeneficiaryRequestId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">— Not linked to a beneficiary —</option>
                {verifiedRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.beneficiary_name} · ${r.amount}
                  </option>
                ))}
              </select>
              {verifiedRequests.length === 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  No verified beneficiary requests to link. Verify one to enable this.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              {proofLabelFor(nextStage)}{" "}
              {proofRequired ? (
                <span className="text-red-500">* required</span>
              ) : (
                <span className="text-zinc-400">(photo or PDF — optional)</span>
              )}
            </label>
            <label
              className={`mt-1 flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-4 text-sm hover:border-emerald-400 hover:bg-emerald-50 ${
                proofRequired && !file
                  ? "border-red-300 text-red-500"
                  : "border-zinc-300 text-zinc-500"
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
            {saving ? "Saving..." : `Advance to ${nextLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
