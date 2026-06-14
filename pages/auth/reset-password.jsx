import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import supabase from "@/utils/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setStatus((prev) => {
        if (prev !== "checking") return prev;
        return data.session ? "ready" : "invalid";
      });
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setStatus("done");
    await supabase.auth.signOut();
    setTimeout(() => router.push("/auth/login"), 1500);
  }

  return (
    <AuthLayout
      title="Reset Password"
      imageGradient="from-emerald-900 via-teal-700 to-cyan-500"
      tagline={{ eyebrow: "Fresh start", line: "A new password and you're back on track." }}
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
        {status === "checking" && (
          <div className="py-8 text-center text-sm text-zinc-500">Verifying reset link…</div>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Link expired</h1>
            <p className="mt-3 text-sm text-zinc-600">
              This reset link is no longer valid. Reset links expire after a short time.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-8 inline-block w-full rounded-full bg-emerald-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Request a new link
            </Link>
          </>
        )}

        {status === "done" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Password updated</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Your password has been reset. Redirecting you to sign in…
            </p>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Reset Password</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Your new password must be different from your previous passwords.
            </p>

            {errorMsg && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5 animate-stagger">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-zinc-900">
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  variant="pill"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-semibold text-zinc-900">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirm"
                  variant="pill"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm Password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
