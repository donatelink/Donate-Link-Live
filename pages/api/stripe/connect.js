// Stripe Connect for NGOs. Each NGO links its own Stripe account so card
// donations are paid straight to it. Uses Accounts v2 (Stripe refuses v1 account
// creation on new platforms) with the "recipient" configuration: the NGO
// receives destination-charge transfers; DonateLink's checkout takes the payment.
//   POST { action: "onboard" } → returns a Stripe-hosted onboarding URL
//   POST { action: "status" }  → refreshes and returns whether the NGO can take cards
import { getAdminClient, getCaller, getStripe, siteOrigin } from "@/utils/stripeServer";

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

  const { data: ngo } = await admin
    .from("ngos")
    .select("id, org_name, email, website, status, stripe_account_id")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!ngo) return res.status(403).json({ error: "Only an NGO account can connect Stripe" });

  const { action } = req.body || {};

  try {
    if (action === "onboard") {
      let accountId = ngo.stripe_account_id;
      if (!accountId) {
        const account = await stripe.v2.core.accounts.create(
          {
            display_name: ngo.org_name,
            contact_email: ngo.email || caller.email,
            identity: { country: "us" },
            dashboard: "express",
            defaults: {
              responsibilities: { fees_collector: "application", losses_collector: "application" },
            },
            configuration: {
              recipient: {
                capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
              },
            },
            metadata: { ngo_id: ngo.id },
          },
          { idempotencyKey: `connect-account-${ngo.id}` }
        );
        accountId = account.id;
        const { error } = await admin
          .from("ngos")
          .update({ stripe_account_id: accountId })
          .eq("id", ngo.id);
        if (error) return res.status(500).json({ error: error.message });
      }

      const origin = siteOrigin(req);
      const link = await stripe.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            refresh_url: `${origin}/ngo/settings?stripe=refresh`,
            return_url: `${origin}/ngo/settings?stripe=return`,
          },
        },
      });
      return res.status(200).json({ url: link.url });
    }

    if (action === "status") {
      if (!ngo.stripe_account_id) {
        return res.status(200).json({ connected: false, chargesEnabled: false });
      }
      const account = await stripe.v2.core.accounts.retrieve(ngo.stripe_account_id, {
        include: ["configuration.recipient"],
      });
      // The NGO can receive card donations once Stripe activates transfers to it.
      const transfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
      const chargesEnabled = transfers?.status === "active";
      const { error } = await admin
        .from("ngos")
        .update({ stripe_charges_enabled: chargesEnabled })
        .eq("id", ngo.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({
        connected: true,
        chargesEnabled,
        accountId: account.id,
      });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
