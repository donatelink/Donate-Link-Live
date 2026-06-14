import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import supabase from "@/utils/supabase";

function dashForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "ngo") return "/ngo/dashboard";
  if (role === "beneficiary") return "/beneficiary/dashboard";
  return "/donor/dashboard";
}

export default function FeedbackPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [backHref, setBackHref] = useState("/");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      const { data: row } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setBackHref(dashForRole(row?.role || session.user.user_metadata?.role));
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>Feedback · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <Link
              href={backHref}
              className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 sm:px-4 sm:text-sm"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Send feedback</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Found a bug or have a suggestion? Let the DonateLink team know.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            {ready && <FeedbackForm />}
          </div>
        </main>
      </div>
    </>
  );
}
