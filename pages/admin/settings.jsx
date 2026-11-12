import Head from "next/head";
import DashboardSidebar from "@/components/DashboardSidebar";
import UserSettingsForm from "@/components/UserSettingsForm";

export default function AdminSettings() {
  return (
    <>
      <Head>
        <title>Settings · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50 md:flex">
        <DashboardSidebar role="admin" active="settings" />

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">Update your admin profile.</p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <UserSettingsForm />
          </div>
          </div>
        </main>
      </div>
    </>
  );
}
