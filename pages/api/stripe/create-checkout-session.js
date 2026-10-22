// Starts a card payment for a donation the donor has already created (stage 1,
// payment_status 'pending'). Uses Stripe Connect destination charges: the money
// goes straight to the NGO's connected Stripe account, DonateLink never holds it.
// The amount is read from the database, never trusted from the browser.
import { calculateFees } from "@/components/FeeBreakdown";
import { getAdminClient, getCaller, getStripe, siteOrigin } from "@/utils/stripeServer";

// The donor can't change payment_status themselves, so when a checkout can't
// even start, the server closes the row out instead of leaving it 'pending'.
function failDonation(admin, id) {
  return admin.from("donations").update({ payment_status: "failed" }).eq("id", id).eq("payment_status", "pending");
}

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

  const { donationId } = req.body || {};
  if (!donationId) return res.status(400).json({ error: "Missing donationId" });

  const { data: donation } = await admin
    .from("donations")
    .select("*")
    .eq("id", donationId)
    .maybeSingle();
  if (!donation || donation.donor_id !== caller.id) {
    return res.status(404).json({ error: "Donation not found" });
  }
  if (donation.payment_method !== "stripe" || donation.payment_status !== "pending") {
    return res.status(400).json({ error: "This donation is not awaiting a card payment" });
  }

  const { data: ngo } = await admin
    .from("ngos")
    .select("id, org_name, stripe_account_id, stripe_charges_enabled")
    .eq("id", donation.ngo_id)
    .maybeSingle();
  if (!ngo?.stripe_account_id || !ngo.stripe_charges_enabled) {
    await failDonation(admin, donation.id);
    return res.status(400).json({ error: `${ngo?.org_name || "This NGO"} cannot accept card donations yet` });
  }

  // The donor is charged exactly the donation. The NGO pays the card processing
  // fee: it is withheld from the transfer as the application fee, which the
  // platform uses only to cover what Stripe charges it — DonateLink keeps nothing.
  const amount = Number(donation.amount);
  const { processing } = calculateFees(amount, "stripe");
  const totalCents = Math.round(amount * 100);
  const feeCents = Math.round(processing * 100);
  if (feeCents >= totalCents) {
    await failDonation(admin, donation.id);
    return res.status(400).json({ error: "Card donations must be at least $1.00" });
  }

  const origin = siteOrigin(req);
  const back = `${origin}/donor/donation-success?donation=${donation.id}`;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: totalCents,
              product_data: {
                name: `Donation to ${ngo.org_name}`,
                description: `${donation.donation_type} · card processing ($${(feeCents / 100).toFixed(2)}) is paid by the NGO`,
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: feeCents,
          transfer_data: { destination: ngo.stripe_account_id },
          metadata: { donation_id: donation.id },
        },
        // Managed Payments is on by default for new Stripe accounts and rejects Connect fees.
        managed_payments: { enabled: false },
        metadata: { donation_id: donation.id },
        client_reference_id: donation.id,
        customer_email: donation.donor_email || undefined,
        // Shortest expiry Stripe allows, so an abandoned payment is closed out quickly.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: back,
        cancel_url: `${back}&canceled=1`,
      },
      { idempotencyKey: `checkout-${donation.id}` }
    );

    const { error: saveErr } = await admin
      .from("donations")
      .update({ stripe_session_id: session.id })
      .eq("id", donation.id);
    if (saveErr) {
      // Without the session id we could never reconcile this payment — don't let it start.
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      await failDonation(admin, donation.id);
      return res.status(500).json({ error: saveErr.message });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    await failDonation(admin, donation.id);
    return res.status(400).json({ error: err.message });
  }
}
