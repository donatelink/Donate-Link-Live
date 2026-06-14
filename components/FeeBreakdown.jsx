const PAYMENT_FEES = {
  stripe: { label: "Card (Stripe → USDT)", percent: 0.029, flat: 0.3, network: "Polygon" },
  polygon: { label: "USDT on Polygon", percent: 0, flat: 0.01, network: "Polygon" },
  ethereum: { label: "USDT on Ethereum", percent: 0, flat: 2.5, network: "Ethereum" },
};

export function calculateFees(amount, method) {
  const f = PAYMENT_FEES[method];
  const processing = amount * f.percent + f.flat;
  const total = amount + processing;
  return { processing, total, network: f.network, label: f.label };
}

export default function FeeBreakdown({ amount, method }) {
  if (!amount || amount <= 0) return null;
  const { processing, total, network, label } = calculateFees(amount, method);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">🕌</span>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Transparent Fees (Ujrah)
        </p>
      </div>
      <dl className="space-y-2 text-sm">
        <Row label="Donation amount" value={`$${amount.toFixed(2)}`} />
        <Row label={`Processing (${label})`} value={`$${processing.toFixed(2)}`} muted />
        <Row label="Blockchain network" value={network} muted />
        <div className="border-t border-emerald-200 pt-2">
          <Row label="You pay" value={`$${total.toFixed(2)}`} bold />
        </div>
      </dl>
      <p className="mt-3 text-xs text-emerald-700">
        All fees disclosed upfront per Shariah Ujrah principle. No hidden charges, no Riba.
      </p>
    </div>
  );
}

function Row({ label, value, muted, bold }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`${muted ? "text-zinc-500" : "text-zinc-700"} ${bold ? "font-semibold text-zinc-900" : ""}`}>
        {label}
      </dt>
      <dd className={`tabular-nums ${bold ? "font-bold text-zinc-900" : "text-zinc-900"}`}>
        {value}
      </dd>
    </div>
  );
}
