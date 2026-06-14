import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import supabase from "@/utils/supabase";

export default function AcceptInvite() {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setStatus("ready");
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
    setTimeout(() => router.push("/ngo/dashboard"), 1200);
  }

  return (
    <AuthLayout
      title="Activate NGO Account"
      imageGradient="from-emerald-900 via-teal-700 to-cyan-500"
      tagline={{ eyebrow: "You're approved", line: "Set your password and start receiving donations." }}
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
        {status === "checking" && (
          <div className="py-8 text-center text-sm text-zinc-500">Verifying your invite…</div>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Link expired</h1>
            <p className="mt-3 text-sm text-zinc-600">
              This invite link is no longer valid. Please ask the DonateLink admin to re-send your invitation.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block w-full rounded-full bg-emerald-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to home
            </Link>
          </>
        )}

        {status === "done" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Account activated 🎉</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Your NGO account is ready. Taking you to your dashboard…
            </p>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Set your password</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Your NGO application was approved. Create a password to access your dashboard.
            </p>

            {errorMsg && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5 animate-stagger">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-zinc-900">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  variant="pill"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-semibold text-zinc-900">
                  Confirm password
                </label>
                <PasswordInput
                  id="confirm"
                  variant="pill"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Activating..." : "Activate Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
