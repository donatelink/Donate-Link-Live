import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PhoneInput from "@/components/PhoneInput";
import supabase from "@/utils/supabase";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function BeneficiaryProfileForm({ redirectTo, submitLabel = "Save & Continue" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    father_name: "",
    gov_id: "",
    phone: "",
    email: "",
    address: "",
    family_members: "",
  });
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (active) setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("beneficiary_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;

      setUserId(session.user.id);

      // Seed first/last name from the account name if the profile is new.
      const metaName = session.user.user_metadata?.name || "";
      const [seedFirst, ...seedRest] = metaName.split(" ");

      setForm({
        first_name: profile?.first_name || seedFirst || "",
        last_name: profile?.last_name || seedRest.join(" ") || "",
        father_name: profile?.father_name || "",
        gov_id: profile?.gov_id || "",
        phone: profile?.phone || "",
        email: profile?.email || session.user.email || "",
        address: profile?.address || "",
        family_members:
          profile?.family_members != null ? String(profile.family_members) : "",
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setOkMsg("");
    setErrorMsg("");

    const fam = parseInt(form.family_members, 10);
    if (!Number.isFinite(fam) || fam < 1) {
      setErrorMsg("Total family members must be at least 1.");
      return;
    }

    setSaving(true);

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();

    const { error: profErr } = await supabase.from("beneficiary_profiles").upsert(
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        father_name: form.father_name.trim(),
        gov_id: form.gov_id.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        family_members: fam,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (profErr) {
      setErrorMsg(profErr.message);
      setSaving(false);
      return;
    }

    // Keep the shared users.name in sync so the dashboard greeting and
    // request records show the right name.
    const fullName = `${firstName} ${lastName}`.trim();
    await supabase.from("users").update({ name: fullName }).eq("id", userId);
    await supabase.auth.updateUser({ data: { name: fullName } });

    setSaving(false);

    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    setOkMsg("Saved.");
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-zinc-700">
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            required
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className={inputCls}
            placeholder="John"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-zinc-700">
            Last Name
          </label>
          <input
            id="last_name"
            type="text"
            required
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className={inputCls}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="father_name" className="block text-sm font-medium text-zinc-700">
          Father Name
        </label>
        <input
          id="father_name"
          type="text"
          required
          value={form.father_name}
          onChange={(e) => update("father_name", e.target.value)}
          className={inputCls}
          placeholder="Father's full name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="gov_id" className="block text-sm font-medium text-zinc-700">
            Government Issued ID
          </label>
          <input
            id="gov_id"
            type="text"
            required
            value={form.gov_id}
            onChange={(e) => update("gov_id", e.target.value)}
            className={inputCls}
            placeholder="National ID / CNIC / Passport no."
          />
        </div>
        <div>
          <label htmlFor="family_members" className="block text-sm font-medium text-zinc-700">
            Total Family Members
          </label>
          <input
            id="family_members"
            type="number"
            min="1"
            step="1"
            required
            value={form.family_members}
            onChange={(e) => update("family_members", e.target.value)}
            className={inputCls}
            placeholder="e.g. 5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
          Phone Number
        </label>
        <PhoneInput id="phone" required value={form.phone} onChange={(v) => update("phone", v)} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email <span className="text-zinc-400">(from your account)</span>
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          disabled
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-zinc-700">
          Complete Address
        </label>
        <textarea
          id="address"
          rows={3}
          required
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className={inputCls}
          placeholder="House no., street, area, city, postal code"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
