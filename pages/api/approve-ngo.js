// Approves an NGO application: invites the NGO by email (Supabase built-in
// invite email) and marks the application approved with a public slug.
// Runs server-side only — uses the Supabase service role key, never exposed
// to the browser.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function makeSlug(name) {
  const base = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "ngo"}-${suffix}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error:
        "Server not configured: add SUPABASE_SERVICE_ROLE_KEY to the environment.",
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Verify the caller is a signed-in admin.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", caller.user.id)
    .single();
  if (profile?.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }

  // 2. Load the NGO application.
  const { ngoId } = req.body || {};
  if (!ngoId) {
    return res.status(400).json({ error: "Missing ngoId" });
  }

  const { data: ngo, error: ngoErr } = await admin
    .from("ngos")
    .select("*")
    .eq("id", ngoId)
    .single();
  if (ngoErr || !ngo) {
    return res.status(404).json({ error: "NGO application not found" });
  }
  if (ngo.status === "approved") {
    return res.status(400).json({ error: "This NGO is already approved" });
  }

  // 3. Invite the NGO by email. Supabase creates the account in an "invited"
  //    state and emails them a link to set their password.
  const origin =
    req.headers.origin ||
    (req.headers.host ? `https://${req.headers.host}` : SUPABASE_URL);

  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(ngo.email, {
      data: { role: "ngo", name: ngo.org_name },
      redirectTo: `${origin}/auth/accept-invite`,
    });
  if (inviteErr) {
    return res.status(400).json({ error: `Invite failed: ${inviteErr.message}` });
  }

  // 4. Mark the application approved with a public slug + linked account.
  const slug = ngo.slug || makeSlug(ngo.org_name);
  const { error: updateErr } = await admin
    .from("ngos")
    .update({ status: "approved", slug, user_id: invited.user.id })
    .eq("id", ngoId);
  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  return res.status(200).json({ ok: true, slug });
}
