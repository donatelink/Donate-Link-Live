import {
  Baby,
  Droplets,
  Globe,
  GraduationCap,
  HandHeart,
  Siren,
  Stethoscope,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import FeeBreakdown, { calculateFees, usdToPol } from "./FeeBreakdown";
import supabase from "@/utils/supabase";
import {
  explorerTxUrl,
  friendlyChainError,
  hasMetaMask,
  sendDonation,
  shortAddress,
} from "@/utils/chain";

const DONATION_TYPES = [
  { id: "hunger-food", Icon: Utensils, name: "Hunger & Food Crisis", desc: "Meals & food parcels" },
  { id: "clean-water", Icon: Droplets, name: "Clean Water Access", desc: "Wells & safe water" },
  { id: "children-education", Icon: GraduationCap, name: "Children Education", desc: "Schooling & supplies" },
  { id: "medical-healthcare", Icon: Stethoscope, name: "Medical & Healthcare", desc: "Treatment & medicine" },
  { id: "disaster-relief", Icon: Siren, name: "Disaster Relief", desc: "Emergency response" },
  { id: "orphan-care", Icon: Baby, name: "Orphan Care", desc: "Support for orphans" },
  { id: "elderly-care", Icon: HandHeart, name: "Elderly Care", desc: "Care for elders" },
  { id: "others", Icon: Globe, name: "Others", desc: "Any other cause" },
];

const PRESET_AMOUNTS = [10, 25, 50, 100, 500];

const PAYMENT_METHODS = [
  {
    id: "polygon",
    emoji: "⛓️",
    label: "Polygon",
    desc: "MetaMask · real on-chain transaction",
    live: true,
  },
  {
    id: "stripe",
    emoji: "💳",
    label: "Card",
    desc: "Visa / Mastercard · secure Stripe checkout (test mode)",
    live: false,
  },
  {
    id: "ethereum",
    emoji: "🔷",
    label: "Ethereum",
    desc: "Coming soon",
    live: false,
    disabled: true,
  },
];

const STEPS = ["Type", "Amount", "Payment", "Confirm"];

export default function DonationModal({ open, onClose, ngo, onDonated }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("50");
  const [method, setMethod] = useState("polygon");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setType(null);
    setAmount(50);
    setCustomAmount("50");
    setMethod("polygon");
    setSubmitting(false);
    setErrorMsg("");
    setDone(false);
    setTxHash("");
    setStatusMsg("");
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ngo) return null;

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const canNext =
    (step === 0 && type) ||
    (step === 1 && finalAmount > 0) ||
    (step === 2 && method) ||
    step === 3;

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSubmit();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg("");
    setStatusMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Please sign in as a donor to donate.");
      setSubmitting(false);
      return;
    }

    const typeLabel = DONATION_TYPES.find((t) => t.id === type)?.name || "Others";
    const onChain = !!PAYMENT_METHODS.find((m) => m.id === method)?.live;

    // Fail fast on the things that would otherwise strand a transaction.
    if (onChain) {
      if (!ngo.wallet_address) {
        setErrorMsg(
          `${ngo.org_name} has not added a payout wallet yet, so on-chain donations to them are not possible. Choose Card, or contact the NGO.`
        );
        setSubmitting(false);
        return;
      }
      if (!hasMetaMask()) {
        setErrorMsg("MetaMask is required for on-chain donations. Install it from metamask.io.");
        setSubmitting(false);
        return;
      }
    }

    if (method === "stripe" && !ngo.stripe_charges_enabled) {
      setErrorMsg(
        `${ngo.org_name} has not connected a Stripe account yet, so card donations to them are not possible.`
      );
      setSubmitting(false);
      return;
    }

    // Write the record BEFORE any money moves, so a donation can never go
    // on-chain without a matching row to reconcile against.
    const { data: row, error: insertError } = await supabase
      .from("donations")
      .insert({
        donor_id: user.id,
        ngo_id: ngo.id,
        amount: finalAmount,
        donation_type: typeLabel,
        stage: 1,
        donor_name: user.user_metadata?.name || user.email,
        donor_email: user.email,
        ngo_name: ngo.org_name,
        payment_method: method,
        chain: onChain ? "polygon-amoy" : null,
        onchain_status: onChain ? "pending" : null,
      })
      .select()
      .single();

    if (insertError) {
      setErrorMsg(insertError.message);
      setSubmitting(false);
      return;
    }

    if (method === "stripe") {
      // Hand over to Stripe's hosted checkout. The donation is confirmed when
      // Stripe reports the payment, never by this page.
      setStatusMsg("Opening secure card checkout…");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ donationId: row.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        setErrorMsg(body.error || "Could not start the card payment. Please try again.");
        setStatusMsg("");
        setSubmitting(false);
        return;
      }
      window.location.assign(body.url);
      return;
    }

    if (!onChain) {
      setSubmitting(false);
      setDone(true);
      if (onDonated) onDonated();
      return;
    }

    try {
      setStatusMsg("Confirm the transaction in MetaMask…");
      const result = await sendDonation({
        ngoWallet: ngo.wallet_address,
        ngoId: ngo.id,
        cause: typeLabel,
        amountPol: usdToPol(finalAmount).toFixed(6),
      });

      setStatusMsg("Transaction confirmed. Saving…");

      // Payment is proven on-chain, so the donation moves to Stage 2 (Confirmed).
      const { error: updateError } = await supabase
        .from("donations")
        .update({
          tx_hash: result.hash,
          from_address: result.from,
          contract_address: result.contractAddress,
          onchain_donation_id: result.onchainId,
          onchain_status: "confirmed",
          stage: 2,
        })
        .eq("id", row.id);

      setTxHash(result.hash);
      setStatusMsg("");
      setSubmitting(false);

      if (updateError) {
        // The money DID move — surface the hash so it can never be lost.
        setErrorMsg(
          `Your transaction succeeded but saving it failed: ${updateError.message}. Keep the transaction hash below and contact support.`
        );
        return;
      }

      setDone(true);
      if (onDonated) onDonated();
    } catch (err) {
      // Nothing moved on-chain — mark the row so it is not mistaken for a real donation.
      await supabase.from("donations").update({ onchain_status: "failed" }).eq("id", row.id);
      setErrorMsg(friendlyChainError(err));
      setStatusMsg("");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-900">
              {txHash ? "Donation confirmed on-chain" : "Donation submitted"}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your ${finalAmount.toFixed(2)} donation to{" "}
              <span className="font-semibold">{ngo.org_name}</span> is now at{" "}
              <span className="font-semibold">
                {txHash ? "Stage 2 — Confirmed" : "Stage 1 — Pending"}
              </span>
              . Track it from your dashboard.
            </p>
            {txHash && (
              <div className="mx-auto mt-4 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Transaction hash
                </p>
                <p className="mt-1 break-all font-mono text-xs text-zinc-700">{txHash}</p>
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline hover:text-emerald-800"
                >
                  Verify on PolygonScan →
                </a>
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <Header step={step} ngoName={ngo.org_name} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {statusMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  {statusMsg}
                </div>
              )}
              {step === 0 && <StepType type={type} setType={setType} />}
              {step === 1 && (
                <StepAmount
                  amount={amount}
                  setAmount={setAmount}
                  customAmount={customAmount}
                  setCustomAmount={setCustomAmount}
                />
              )}
              {step === 2 && (
                <StepPayment
                  method={method}
                  setMethod={setMethod}
                  amount={finalAmount}
                  ngo={ngo}
                />
              )}
              {step === 3 && (
                <StepConfirm
                  ngoName={ngo.org_name}
                  type={type}
                  amount={finalAmount}
                  method={method}
                  ngo={ngo}
                />
              )}
            </div>
            <Footer
              step={step}
              canNext={canNext}
              submitting={submitting}
              onBack={() => setStep(Math.max(0, step - 1))}
              onNext={handleNext}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Header({ step, ngoName, onClose }) {
  return (
    <div className="border-b border-zinc-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">
          Donate to <span className="text-emerald-700">{ngoName}</span>
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
      <div className="mt-3 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? "text-zinc-900" : "text-zinc-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? "bg-emerald-600" : "bg-zinc-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer({ step, canNext, submitting, onBack, onNext }) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4">
      <button
        onClick={onBack}
        disabled={step === 0 || submitting}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:border-zinc-400"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={!canNext || submitting}
        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {step === STEPS.length - 1
          ? submitting
            ? "Donating..."
            : "Donate Now"
          : "Continue →"}
      </button>
    </div>
  );
}

function StepType({ type, setType }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">Choose a Cause</h3>
      <p className="text-xs text-zinc-500">Pick the cause you want to support.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DONATION_TYPES.map((t) => {
          const I = t.Icon;
          return (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-xl border p-3 text-left transition ${
                type === t.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  type === t.id ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                <I size={18} strokeWidth={2.2} />
              </span>
              <div className="mt-2 text-sm font-semibold text-zinc-900">{t.name}</div>
              <div className="text-xs text-zinc-500">{t.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAmount({ amount, setAmount, customAmount, setCustomAmount }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">Amount (USD)</h3>
      <p className="text-xs text-zinc-500">Pick a preset or enter a custom amount.</p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => {
              setAmount(a);
              setCustomAmount(String(a));
            }}
            className={`rounded-lg border py-3 text-sm font-semibold transition ${
              Number(customAmount) === a
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
            }`}
          >
            ${a}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-zinc-700">Custom amount</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full rounded-lg border border-zinc-300 py-2 pl-7 pr-3 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
    </div>
  );
}

function StepPayment({ method, setMethod, amount, ngo }) {
  const selected = PAYMENT_METHODS.find((m) => m.id === method);
  const needsWallet = selected?.live && !ngo?.wallet_address;
  const needsStripe = method === "stripe" && !ngo?.stripe_charges_enabled;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Payment Method</h3>
        <p className="text-xs text-zinc-500">
          Polygon sends a real transaction from your own wallet, recorded on-chain for anyone to
          verify.
        </p>
        <div className="mt-3 space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              disabled={m.disabled}
              onClick={() => !m.disabled && setMethod(m.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                m.disabled
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60"
                  : method === m.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">{m.label}</span>
                  {m.live && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      On-chain
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">{m.desc}</div>
              </div>
              {!m.disabled && (
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    method === m.id ? "border-emerald-600 bg-emerald-600" : "border-zinc-300"
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {needsWallet && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {ngo?.org_name} has not added a payout wallet yet, so they cannot receive on-chain
          donations. Pick Card instead, or come back once they have.
        </div>
      )}

      {needsStripe && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {ngo?.org_name} has not connected a Stripe account yet, so they cannot receive card
          donations. Pick Polygon instead, or come back once they have.
        </div>
      )}

      {method === "stripe" && !needsStripe && (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
          Your card payment goes straight to {ngo.org_name}&apos;s own Stripe account — DonateLink
          never holds the funds. Card details are entered on Stripe&apos;s secure page, never here.
        </div>
      )}

      {selected?.live && ngo?.wallet_address && (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
          Funds go straight to {ngo.org_name}&apos;s wallet{" "}
          <span className="font-mono text-zinc-800">{shortAddress(ngo.wallet_address)}</span>. You
          will need MetaMask on the Polygon Amoy network.
        </div>
      )}

      <FeeBreakdown amount={amount} method={method} />
    </div>
  );
}

function StepConfirm({ ngoName, type, amount, method, ngo }) {
  const typeLabel = DONATION_TYPES.find((t) => t.id === type)?.name || type;
  const selected = PAYMENT_METHODS.find((m) => m.id === method);
  const methodLabel = selected?.label || method;
  const { total, onchain, amountPol, processing, ngoReceives } = calculateFees(amount, method);

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">Review your donation</h3>
      <p className="text-xs text-zinc-500">Verify everything before confirming.</p>

      <dl className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        <Summary label="NGO" value={ngoName} />
        <Summary label="Type" value={typeLabel} />
        <Summary label="Amount" value={`$${amount.toFixed(2)}`} />
        <Summary label="Payment" value={methodLabel} />
        {onchain ? (
          <>
            <Summary label="Sending" value={`${amountPol.toFixed(4)} POL`} />
            <Summary label="To wallet" value={shortAddress(ngo?.wallet_address)} />
            <Summary label="Network" value="Polygon Amoy" highlight />
          </>
        ) : (
          <>
            <Summary label="Total charge" value={`$${total.toFixed(2)}`} highlight />
            {method === "stripe" && (
              <Summary
                label="NGO receives"
                value={`$${ngoReceives.toFixed(2)} (after $${processing.toFixed(2)} card fee)`}
              />
            )}
          </>
        )}
      </dl>

      <p className="mt-4 text-xs text-zinc-500">
        {onchain ? (
          <>
            Clicking <strong>Donate Now</strong> opens MetaMask to sign a real transaction. Once it
            confirms, your donation is recorded on-chain and enters{" "}
            <strong>Stage 2: Confirmed</strong>; the NGO then advances it through the remaining
            stages with proof.
          </>
        ) : method === "stripe" ? (
          <>
            Clicking <strong>Donate Now</strong> takes you to Stripe&apos;s secure checkout. Once
            your card is charged, the donation enters <strong>Stage 2: Confirmed</strong> and the
            money is paid straight to {ngoName}; the NGO then advances it through the remaining
            stages with proof.
          </>
        ) : (
          <>
            By clicking <strong>Donate Now</strong>, your donation enters{" "}
            <strong>Stage 1: Pending</strong> and the NGO will update its progress through all 5
            stages.
          </>
        )}
      </p>
    </div>
  );
}

function Summary({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`tabular-nums ${highlight ? "font-bold text-emerald-700" : "font-medium text-zinc-900"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
