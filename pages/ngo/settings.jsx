import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import CountrySelect from "@/components/CountrySelect";
import PasswordInput from "@/components/PasswordInput";
import PhoneInput from "@/components/PhoneInput";
import supabase from "@/utils/supabase";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function NgoSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ngo, setNgo] = useState(null);
  const [form, setForm] = useState({
    org_name: "",
    description: "",
    country: "",
    website: "",
    contact_person: "",
    phone: "",
    wallet_address: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [stripeInfo, setStripeInfo] = useState({ connected: false, chargesEnabled: false });
  const [stripeBusy, setStripeBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      const { data: ngoRow, error } = await supabase
        .from("ngos")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      setNgo(ngoRow || null);
      if (ngoRow) {
        setForm({
          org_name: ngoRow.org_name || "",
          description: ngoRow.description || "",
          country: ngoRow.country || "",
          website: ngoRow.website || "",
          contact_person: ngoRow.contact_person || "",
          phone: ngoRow.phone || "",
          wallet_address: ngoRow.wallet_address || "",
        });
        setLogoUrl(ngoRow.logo_url || "");
        setStripeInfo({
          connected: !!ngoRow.stripe_account_id,
          chargesEnabled: !!ngoRow.stripe_charges_enabled,
        });
        // Re-check with Stripe whenever an account exists, so finishing
        // onboarding (and coming back here) is reflected right away.
        if (ngoRow.stripe_account_id) refreshStripe(session.access_token);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function callStripe(action, token) {
    if (!token) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token;
    }
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Stripe request failed");
    return body;
  }

  async function refreshStripe(token) {
    try {
      const info = await callStripe("status", token);
      setStripeInfo(info);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function connectStripe() {
    setStripeBusy(true);
    setErrorMsg("");
    try {
      const { url } = await callStripe("onboard");
      window.location.assign(url);
    } catch (err) {
      setErrorMsg(err.message);
      setStripeBusy(false);
    }
  }

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFilePreview(f ? URL.createObjectURL(f) : "");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!ngo) return;
    setOkMsg("");
    setErrorMsg("");

    // Catch a malformed wallet here rather than letting the DB constraint reject it.
    const wallet = form.wallet_address.trim();
    if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setErrorMsg("Wallet address must be 0x followed by 40 hexadecimal characters.");
      return;
    }

    setSaving(true);

    let newLogoUrl = logoUrl;
    if (file) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `ngo-${ngo.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setErrorMsg(`Logo upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }
      newLogoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error: ngoErr } = await supabase
      .from("ngos")
      .update({
        org_name: form.org_name.trim(),
        description: form.description.trim(),
        country: form.country.trim(),
        website: form.website.trim() || null,
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        logo_url: newLogoUrl || null,
        wallet_address: wallet || null,
      })
      .eq("id", ngo.id);
    if (ngoErr) {
      setErrorMsg(ngoErr.message);
      setSaving(false);
      return;
    }

    if (newPassword) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) {
        setErrorMsg(pwErr.message);
        setSaving(false);
        return;
      }
    }

    setLogoUrl(newLogoUrl);
    setFile(null);
    setFilePreview("");
    setNewPassword("");
    setOkMsg("Saved.");
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const previewUrl = filePreview || logoUrl;

  return (
    <>
      <Head>
        <title>NGO Settings · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/ngo/dashboard"
                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
              >
                ← Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">NGO Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Update your organization profile. Changes show on donor + beneficiary NGO cards.
          </p>

          {loading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

          {!loading && !ngo && (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <p className="text-sm text-zinc-600">No NGO profile linked to this account.</p>
            </div>
          )}

          {!loading && ngo && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <form onSubmit={handleSave} className="space-y-5">
                {okMsg && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {okMsg}
                  </div>
                )}
                {errorMsg && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Avatar src={previewUrl} name={form.org_name} size="xl" />
                  <div>
                    <label className="inline-block cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="hidden"
                      />
                      {file ? "Change logo" : "Upload organization logo"}
                    </label>
                    {file && <p className="mt-1 text-xs text-zinc-500">{file.name}</p>}
                    {logoUrl && !file && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="ml-2 text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="org_name" className="block text-sm font-medium text-zinc-700">
                    Organization Name
                  </label>
                  <input
                    id="org_name"
                    type="text"
                    required
                    value={form.org_name}
                    onChange={(e) => update("org_name", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Registration Number <span className="text-zinc-400">(locked)</span>
                  </label>
                  <input
                    type="text"
                    value={ngo.reg_number}
                    disabled
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
                    About
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-zinc-700">
                    Country
                  </label>
                  <CountrySelect
                    id="country"
                    required
                    value={form.country}
                    onChange={(v) => update("country", v)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact_person" className="block text-sm font-medium text-zinc-700">
                      Contact Person
                    </label>
                    <input
                      id="contact_person"
                      type="text"
                      required
                      value={form.contact_person}
                      onChange={(e) => update("contact_person", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
                      Phone
                    </label>
                    <PhoneInput
                      id="phone"
                      required
                      value={form.phone}
                      onChange={(v) => update("phone", v)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-zinc-700">
                    Website <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://example.org"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="wallet_address" className="block text-sm font-medium text-zinc-700">
                    Payout wallet address{" "}
                    <span className="text-zinc-400">(for on-chain donations)</span>
                  </label>
                  <input
                    id="wallet_address"
                    type="text"
                    value={form.wallet_address}
                    onChange={(e) => update("wallet_address", e.target.value)}
                    placeholder="0x0000000000000000000000000000000000000000"
                    spellCheck={false}
                    className={`${inputClass} font-mono text-sm`}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Donations paid on Polygon are sent straight to this wallet — DonateLink never
                    holds the funds. Leave blank to accept card donations only.{" "}
                    <strong>Double-check it:</strong> crypto sent to a wrong address cannot be
                    recovered.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Card payouts <span className="text-zinc-400">(Stripe)</span>
                  </label>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-300 px-3 py-2.5">
                    <span className="text-sm text-zinc-700">
                      {stripeInfo.chargesEnabled
                        ? "✓ Connected — accepting card donations"
                        : stripeInfo.connected
                          ? "Setup not finished"
                          : "Not connected"}
                    </span>
                    {!stripeInfo.chargesEnabled && (
                      <button
                        type="button"
                        onClick={connectStripe}
                        disabled={stripeBusy}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:enabled:bg-zinc-700 disabled:opacity-60"
                      >
                        {stripeBusy
                          ? "Opening Stripe…"
                          : stripeInfo.connected
                            ? "Finish Stripe setup"
                            : "Connect Stripe"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Card donations are paid straight into your own Stripe account — DonateLink never
                    holds the funds. Setup happens on Stripe&apos;s secure page; in test mode use
                    Stripe&apos;s test data, no real documents.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Email <span className="text-zinc-400">(locked)</span>
                  </label>
                  <input
                    type="email"
                    value={ngo.email}
                    disabled
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700">
                    Change Password <span className="text-zinc-400">(optional)</span>
                  </label>
                  <PasswordInput
                    id="newPassword"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
