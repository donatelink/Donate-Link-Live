// Server-only helpers shared by the Stripe API routes. Never import this from a
// page or component — it reads the Stripe secret key and the Supabase service
// role key, neither of which may reach the browser.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripeClient = null;

export function getStripe() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Server not configured: add STRIPE_SECRET_KEY to the environment.");
  }
  if (!stripeClient) stripeClient = new Stripe(STRIPE_SECRET_KEY);
  return stripeClient;
}

export function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Server not configured: add SUPABASE_SERVICE_ROLE_KEY to the environment.");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Resolves the signed-in user from the "Authorization: Bearer <token>" header.
export async function getCaller(req, admin) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function siteOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

// Applies a Checkout Session's outcome to its donation row. Called from both the
// webhook and the success page, so it must be idempotent: each transition only
// fires while the row is still 'pending', and a second call changes nothing.
export async function applyCheckoutSession(admin, session) {
  const donationId = session.metadata?.donation_id;
  if (!donationId) return { status: "ignored" };

  if (session.payment_status === "paid") {
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;
    const { error } = await admin
      .from("donations")
      .update({ payment_status: "paid", stage: 2, stripe_payment_intent: paymentIntent })
      .eq("id", donationId)
      .eq("payment_status", "pending");
    if (error) throw error;
    return { status: "paid" };
  }

  if (session.status === "expired") {
    const { error } = await admin
      .from("donations")
      .update({ payment_status: "failed" })
      .eq("id", donationId)
      .eq("payment_status", "pending");
    if (error) throw error;
    return { status: "failed" };
  }

  return { status: "pending" };
}
