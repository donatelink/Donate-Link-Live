import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopBar from "@/components/DashboardTopBar";
import FeedbackForm from "@/components/FeedbackForm";
import supabase from "@/utils/supabase";

export default function FeedbackPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(null);

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
      setRole(row?.role || session.user.user_metadata?.role || "donor");
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
      <div className={`min-h-screen bg-zinc-50 ${role === "ngo" || role === "admin" ? "md:flex" : ""}`}>
        {(role === "ngo" || role === "admin") && <DashboardSidebar role={role} active="feedback" />}
        {(role === "donor" || role === "beneficiary") && <DashboardTopBar role={role} active="feedback" />}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Send feedback</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Found a bug or have a suggestion? Let the DonateLink team know.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            {ready && <FeedbackForm />}
          </div>
          </div>
        </main>
      </div>
    </>
  );
}
