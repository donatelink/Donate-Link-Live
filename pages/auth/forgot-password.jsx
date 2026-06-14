import Link from "next/link";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import supabase from "@/utils/supabase";

const pillInput =
  "mt-1 w-full rounded-full border border-zinc-300 px-5 py-3 text-sm text-black transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <AuthLayout
      title="Forgot Password"
      imageGradient="from-emerald-900 via-teal-700 to-cyan-500"
      tagline={{ eyebrow: "Account recovery", line: "We'll get you back in, fast." }}
      features={[]}
    >
      <Link
        href="/auth/login"
        aria-label="Back to sign in"
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <div className="mt-8">
        {sent ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Check your email</h1>
            <p className="mt-3 text-sm text-zinc-600">
              We sent a password reset link to{" "}
              <span className="font-semibold text-zinc-900">{email}</span>.
              Click the link in the email to set a new password.
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Didn't get it? Check your spam folder, or{" "}
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="font-semibold text-zinc-900 underline underline-offset-4"
              >
                try a different email
              </button>
              .
            </p>
            <Link
              href="/auth/login"
              className="mt-8 inline-block w-full rounded-full bg-emerald-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Forgot Password</h1>
            <p className="mt-3 text-sm text-zinc-600">
              We'll send a verification link to your email address.
            </p>

            {errorMsg && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5 animate-stagger">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending link..." : "Send Verification Code"}
              </button>
            </form>

            <p className="mt-6 text-sm text-zinc-600">
              Remembered it?{" "}
              <Link href="/auth/login" className="font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
