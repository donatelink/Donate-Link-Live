// Stripe → DonateLink webhook. Stripe calls this when a Checkout Session is paid
// or expires. The signature check proves the request came from Stripe, so the
// payment status can be trusted even though no user is signed in.
import { applyCheckoutSession, getAdminClient, getStripe } from "@/utils/stripeServer";

// Stripe signs the exact raw bytes, so Next.js must not parse the body.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server not configured: add STRIPE_WEBHOOK_SECRET." });
  }

  let event;
  try {
    const raw = await readRawBody(req);
    event = getStripe().webhooks.constructEvent(raw, req.headers["stripe-signature"], secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature check failed: ${err.message}` });
  }

  if (HANDLED.has(event.type)) {
    try {
      const session = event.data.object;
      // An async payment failure leaves the session "complete" but unpaid — treat as failed.
      const outcome =
        event.type === "checkout.session.async_payment_failed"
          ? { ...session, status: "expired" }
          : session;
      await applyCheckoutSession(getAdminClient(), outcome);
    } catch (err) {
      // A 500 makes Stripe retry later, which is what we want if the DB was unreachable.
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}
