import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import CountrySelect from "@/components/CountrySelect";
import GoogleButton from "@/components/GoogleButton";
import PasswordInput from "@/components/PasswordInput";
import PhoneInput from "@/components/PhoneInput";
import supabase from "@/utils/supabase";

const ROLES = [
  { value: "donor", label: "Donor", desc: "Give to causes worldwide" },
  { value: "beneficiary", label: "Beneficiary", desc: "Request help from an NGO" },
  { value: "ngo", label: "NGO", desc: "Receive verified funds" },
];

const pillInput =
  "mt-1 w-full rounded-full border border-zinc-300 px-5 py-3 text-sm text-black transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";

function destForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "ngo") return "/ngo/dashboard";
  if (role === "beneficiary") return "/beneficiary/dashboard";
  return "/donor/dashboard";
}

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "donor",
    orgName: "",
    regNumber: "",
    contactPerson: "",
    phone: "",
    country: "",
    website: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [applied, setApplied] = useState(false);

  const isNgo = form.role === "ngo";

  // If a Google OAuth callback lands here, route by role.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !active) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (active) router.replace(destForRole(profile?.role));
    })();
    return () => {
      active = false;
    };
  }, [router]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (isNgo) {
      const { error: insertError } = await supabase.from("ngos").insert({
        user_id: null,
        org_name: form.orgName,
        reg_number: form.regNumber,
        contact_person: form.contactPerson,
        phone: form.phone,
        email: form.email,
        country: form.country,
        website: form.website || null,
        category: "General",
        description: form.description,
      });

      if (insertError) {
        setErrorMsg(insertError.message);
        setLoading(false);
        return;
      }

      setApplied(true);
      setLoading(false);
      return;
    }

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: fullName, role: form.role },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setErrorMsg(
        "Account created — please check your email to confirm before signing in."
      );
      setLoading(false);
      return;
    }

    // Beneficiaries must complete their profile before the dashboard.
    if (form.role === "beneficiary") {
      router.push("/beneficiary/profile");
      return;
    }
    router.push(destForRole(form.role));
  }

  return (
    <AuthLayout
      title="Create Account"
      imageGradient="from-emerald-900 via-teal-700 to-cyan-500"
      tagline={{ eyebrow: "Join DonateLink", line: "Give, receive, and {rot} every step." }}
      rotatingWords={["track", "trust", "verify"]}
    >
      <Link
        href="/"
        aria-label="Back to home"
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <div className="mt-6">
        {applied ? (
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Application submitted
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              Thanks for applying. Our team will review{" "}
              <span className="font-semibold text-zinc-900">{form.orgName}</span>. Once approved,
              you'll get an email to set your password and access your NGO dashboard.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block w-full rounded-full bg-emerald-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Create an Account</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                Log in
              </Link>
            </p>

            {errorMsg && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 animate-stagger">
              <div className="inline-flex w-full rounded-full bg-zinc-100 p-1">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("role", r.value)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                      form.role === r.value
                        ? "bg-emerald-600 text-white shadow-sm scale-[1.02]"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {isNgo ? (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-700">
                    Verified by an admin · we'll email a link to set your password once approved.
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="orgName" className="block text-sm font-semibold text-zinc-900">
                        Organization Name
                      </label>
                      <input
                        id="orgName"
                        type="text"
                        required
                        value={form.orgName}
                        onChange={(e) => update("orgName", e.target.value)}
                        className={pillInput}
                        placeholder="Helping Hands Foundation"
                      />
                    </div>
                    <div>
                      <label htmlFor="regNumber" className="block text-sm font-semibold text-zinc-900">
                        Registration No.
                      </label>
                      <input
                        id="regNumber"
                        type="text"
                        required
                        value={form.regNumber}
                        onChange={(e) => update("regNumber", e.target.value)}
                        className={pillInput}
                        placeholder="Official no."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contactPerson" className="block text-sm font-semibold text-zinc-900">
                        Contact Person
                      </label>
                      <input
                        id="contactPerson"
                        type="text"
                        required
                        value={form.contactPerson}
                        onChange={(e) => update("contactPerson", e.target.value)}
                        className={pillInput}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-zinc-900">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={pillInput}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-zinc-900">
                        Phone Number
                      </label>
                      <PhoneInput
                        id="phone"
                        variant="pill"
                        required
                        value={form.phone}
                        onChange={(v) => update("phone", v)}
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-semibold text-zinc-900">
                        Country
                      </label>
                      <CountrySelect
                        id="country"
                        variant="pill"
                        required
                        value={form.country}
                        onChange={(v) => update("country", v)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-semibold text-zinc-900">
                      Website <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="website"
                      type="url"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                      className={pillInput}
                      placeholder="https://example.org"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-zinc-900">
                      About the Organization
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={2}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      className="mt-1 w-full rounded-3xl border border-zinc-300 px-5 py-3 text-sm text-black focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="Briefly describe your mission and work."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold text-zinc-900">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        className={pillInput}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold text-zinc-900">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        className={pillInput}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-zinc-900">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className={pillInput}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-zinc-900">
                      Password
                    </label>
                    <PasswordInput
                      id="password"
                      variant="pill"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Min. 8 characters"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:enabled:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? isNgo
                    ? "Submitting..."
                    : "Creating account..."
                  : isNgo
                  ? "Submit NGO Form"
                  : "Create Account"}
              </button>
            </form>

            {!isNgo && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
                  <div className="h-px flex-1 bg-zinc-200" />
                  <span>or</span>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>
                <GoogleButton label="Sign up with Google" role={form.role} />
              </>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
