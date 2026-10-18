// Demo conversion rate for the testnet. Amoy POL has no market value, so this is
// a fixed stand-in that keeps the app's USD amounts meaningful while still
// sending a real on-chain value. Mainnet would read a live Chainlink POL/USD feed.
export const POL_USD_RATE = 0.4;
export const IS_TESTNET = true;

// Rough gas cost of a donate() call on Amoy, in POL. Amoy gas is effectively free.
const ESTIMATED_GAS_POL = 0.005;

const PAYMENT_FEES = {
  stripe: { label: "Card (Stripe)", percent: 0.029, flat: 0.3, network: "Stripe → NGO account", onchain: false },
  polygon: { label: "POL on Polygon Amoy", percent: 0, flat: 0, network: "Polygon Amoy", onchain: true },
  ethereum: { label: "Ethereum", percent: 0, flat: 0, network: "Ethereum", onchain: false },
};

export function usdToPol(usd) {
  return usd / POL_USD_RATE;
}

// The donor pays exactly the donation amount. Any card processing fee is
// deducted from what the NGO receives, never added on top for the donor.
export function calculateFees(amount, method) {
  const f = PAYMENT_FEES[method];
  const processing = Math.round((amount * f.percent + f.flat) * 100) / 100;
  return {
    processing,
    total: amount,
    ngoReceives: Math.max(0, Math.round((amount - processing) * 100) / 100),
    network: f.network,
    label: f.label,
    onchain: f.onchain,
    amountPol: f.onchain ? usdToPol(amount) : null,
    gasPol: f.onchain ? ESTIMATED_GAS_POL : null,
  };
}

export default function FeeBreakdown({ amount, method }) {
  if (!amount || amount <= 0) return null;
  const { processing, total, ngoReceives, network, label, onchain, amountPol, gasPol } = calculateFees(
    amount,
    method
  );

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
        {onchain ? (
          <>
            <Row label="You send on-chain" value={`${amountPol.toFixed(4)} POL`} muted />
            <Row label="Estimated gas" value={`~${gasPol} POL`} muted />
            <Row label="Platform fee" value="$0.00" muted />
            <Row label="Network" value={network} muted />
            <div className="border-t border-emerald-200 pt-2">
              <Row label="NGO receives" value={`${amountPol.toFixed(4)} POL (100%)`} bold />
            </div>
          </>
        ) : (
          <>
            <Row label="You pay" value={`$${total.toFixed(2)}`} bold />
            <Row
              label={`Processing (${label}), paid by NGO`}
              value={`−$${processing.toFixed(2)}`}
              muted
            />
            <Row label="Settlement" value={network} muted />
            <div className="border-t border-emerald-200 pt-2">
              <Row label="NGO receives" value={`$${ngoReceives.toFixed(2)}`} bold />
            </div>
          </>
        )}
      </dl>
      {onchain ? (
        <p className="mt-3 text-xs text-emerald-700">
          The smart contract takes no cut — the full amount goes straight to the NGO&apos;s wallet, and
          the transaction is publicly verifiable.
          {IS_TESTNET && (
            <>
              {" "}
              Testnet demo at a fixed rate of ${POL_USD_RATE.toFixed(2)}/POL; Amoy POL has no real
              value.
            </>
          )}
        </p>
      ) : (
        <p className="mt-3 text-xs text-emerald-700">
          All fees disclosed upfront per Shariah Ujrah principle. No hidden charges, no Riba. You pay
          only your donation; Stripe&apos;s card fee is deducted from the NGO&apos;s share, and
          DonateLink takes no commission.
        </p>
      )}
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
