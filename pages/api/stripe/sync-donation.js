// Called by the page Stripe redirects back to. Asks Stripe directly whether the
// donation's Checkout Session was paid and applies the result — so a payment is
// confirmed even when the webhook can't reach the server (e.g. on localhost).
// With { cancel: true } it closes an unpaid session the donor backed out of.
import { applyCheckoutSession, getAdminClient, getCaller, getStripe } from "@/utils/stripeServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let admin, stripe;
  try {
    admin = getAdminClient();
    stripe = getStripe();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const caller = await getCaller(req, admin);
  if (!caller) return res.status(401).json({ error: "Not authenticated" });

  const { donationId, cancel } = req.body || {};
  const { data: donation } = await admin
    .from("donations")
    .select("id, donor_id, stripe_session_id, payment_status")
    .eq("id", donationId)
    .maybeSingle();
  if (!donation || donation.donor_id !== caller.id) {
    return res.status(404).json({ error: "Donation not found" });
  }
  if (!donation.stripe_session_id) {
    return res.status(200).json({ status: donation.payment_status || "pending" });
  }

  try {
    let session = await stripe.checkout.sessions.retrieve(donation.stripe_session_id);
    if (cancel && session.status === "open") {
      session = await stripe.checkout.sessions.expire(session.id);
    }
    const { status } = await applyCheckoutSession(admin, session);
    return res.status(200).json({ status });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
