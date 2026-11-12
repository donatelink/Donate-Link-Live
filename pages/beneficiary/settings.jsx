import Head from "next/head";
import DashboardTopBar from "@/components/DashboardTopBar";
import BeneficiaryProfileForm from "@/components/BeneficiaryProfileForm";
import UserSettingsForm from "@/components/UserSettingsForm";

export default function BeneficiarySettings() {
  return (
    <>
      <Head>
        <title>Settings · DonateLink</title>
      </Head>
      <div className="min-h-screen bg-zinc-50">
        <DashboardTopBar role="beneficiary" active="settings" />

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 animate-page-in">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">Update your beneficiary profile.</p>

          <div className="mt-6">
            <h2 className="text-base font-semibold text-zinc-900">Beneficiary details</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Used by NGOs to verify your funding requests.
            </p>
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <BeneficiaryProfileForm submitLabel="Save Details" />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-base font-semibold text-zinc-900">Account</h2>
            <p className="mt-1 text-sm text-zinc-600">Profile image, password, and contact phone.</p>
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <UserSettingsForm />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
