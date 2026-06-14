import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import PasswordInput from "@/components/PasswordInput";
import supabase from "@/utils/supabase";

const pillInput =
  "mt-1 w-full rounded-full border border-zinc-300 px-5 py-3 text-sm text-black transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";

function destForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "ngo") return "/ngo/dashboard";
  if (role === "beneficiary") return "/beneficiary/dashboard";
  return "/donor/dashboard";
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // If we got here via an OAuth callback, Supabase will already have set the
  // session — route to the right dashboard.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !active) return;

      // A Google sign-up stashes the chosen role (OAuth carries none, so the
      // trigger defaults new users to "donor"). Apply it once, for new accounts.
      const pendingRole =
        typeof window !== "undefined" ? window.localStorage.getItem("pendingRole") : null;
      if (pendingRole) window.localStorage.removeItem("pendingRole");

      let { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const isNew =
        Date.now() - new Date(session.user.created_at).getTime() < 120000;
      if (pendingRole && isNew && pendingRole !== profile?.role) {
        await supabase.from("users").update({ role: pendingRole }).eq("id", session.user.id);
        // Mirror the role into auth metadata so it's visible under
        // Authentication → Users (manual signups already store it there).
        await supabase.auth.updateUser({ data: { role: pendingRole } });
        profile = { role: pendingRole };
      }

      if (active) router.replace(destForRole(profile?.role));
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(destForRole(profile?.role));
  }

  return (
    <AuthLayout
      title="Sign In"
      imageGradient="from-emerald-900 via-teal-700 to-cyan-500"
      tagline={{ eyebrow: "Welcome back", line: "Your impact, {rot}." }}
      rotatingWords={["continued", "tracked", "growing"]}
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

      <div className="mt-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Log in</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Don't have an account?{" "}
          <Link href="/auth/register" className="font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
            Create an Account
          </Link>
        </p>

        {errorMsg && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 animate-stagger">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-zinc-900">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="mt-2 flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:enabled:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-zinc-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <GoogleButton label="Continue with Google" />
      </div>
    </AuthLayout>
  );
}
