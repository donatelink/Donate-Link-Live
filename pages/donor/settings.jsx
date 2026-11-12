import Head from "next/head";
import DashboardTopBar from "@/components/DashboardTopBar";
import UserSettingsForm from "@/components/UserSettingsForm";

export default function DonorSettings() {
  return (
    <>
      <Head>
        <title>Settings · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <DashboardTopBar role="donor" active="settings" />

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">Update your donor profile.</p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <UserSettingsForm />
          </div>
        </main>
      </div>
    </>
  );
}
