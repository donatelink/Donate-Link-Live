import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import UserSettingsForm from "@/components/UserSettingsForm";
import supabase from "@/utils/supabase";

export default function AdminSettings() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      <Head>
        <title>Settings · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center">
              <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/admin/dashboard"
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
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">Update your admin profile.</p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <UserSettingsForm />
          </div>
        </main>
      </div>
    </>
  );
}
