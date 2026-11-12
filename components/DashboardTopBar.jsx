import Link from "next/link";
import { useRouter } from "next/router";
import NotificationBell from "@/components/NotificationBell";
import supabase from "@/utils/supabase";

const pill = (isActive) =>
  `rounded-full border px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm ${
    isActive
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
  }`;

// Top bar shared by every Donor / Beneficiary page (dashboard, Feedback,
// Settings), so the menu never disappears. `active`: "dashboard" | "feedback" | "settings".
export default function DashboardTopBar({ role, active }) {
  const router = useRouter();
  const dashboard = role === "beneficiary" ? "/beneficiary/dashboard" : "/donor/dashboard";
  const settings = role === "beneficiary" ? "/beneficiary/settings" : "/donor/settings";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center">
          <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {role === "beneficiary" ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:px-3">
              Beneficiary
            </span>
          ) : (
            <span className="hidden text-sm text-zinc-600 sm:inline">Donor</span>
          )}
          <NotificationBell />
          {active !== "dashboard" && (
            <Link href={dashboard} className={pill(false)}>
              Dashboard
            </Link>
          )}
          <Link href="/feedback" className={pill(active === "feedback")}>
            Feedback
          </Link>
          <Link
            href={settings}
            aria-label="Settings"
            title="Settings"
            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              active === "settings"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <button onClick={handleSignOut} className={pill(false)}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
