import Link from "next/link";
import { useRouter } from "next/router";
import supabase from "@/utils/supabase";

// Tabs inside each dashboard; the open tab lives in the URL (?view=…).
export const NGO_MENU = [
  { id: "donations", label: "Donations", icon: "💸" },
  { id: "requests", label: "Beneficiary Requests", icon: "🤝" },
  { id: "campaigns", label: "Campaigns", icon: "📣" },
  { id: "payments", label: "Payment Methods", icon: "💳" },
];

export const ADMIN_MENU = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "approvals", label: "NGO Approvals", icon: "✅" },
  { id: "ngos", label: "NGOs", icon: "🏢" },
  { id: "feedback", label: "Feedback", icon: "💬" },
];

const itemClass = (isActive) =>
  `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
    isActive ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100" : "text-zinc-600 hover:bg-zinc-100"
  }`;

// Sidebar shared by every NGO / Admin page (dashboard tabs, Feedback, Settings),
// so the menu never disappears. `active` is a tab id, "feedback" or "settings".
// `viewAsNgoId` = the admin's read-only view of one NGO (/admin/ngo/[id]).
export default function DashboardSidebar({ role, active, badges = {}, viewAsNgoId = null }) {
  const router = useRouter();
  const isAdmin = role === "admin";
  const tabs = isAdmin ? ADMIN_MENU : NGO_MENU;
  const base = viewAsNgoId ? `/admin/ngo/${viewAsNgoId}` : isAdmin ? "/admin/dashboard" : "/ngo/dashboard";

  // NGO pages also link to the shared Feedback page; the admin reads feedback in its own tab.
  const extras = viewAsNgoId
    ? []
    : isAdmin
      ? [{ id: "settings", label: "Settings", icon: "⚙️", href: "/admin/settings" }]
      : [
          { id: "feedback", label: "Feedback", icon: "💬", href: "/feedback" },
          { id: "settings", label: "Settings", icon: "⚙️", href: "/ngo/settings" },
        ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Sign Out (or Back to Admin): a small pill on mobile, a full-width button on desktop.
  function bottom(mobile) {
    const cls = mobile
      ? "rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
      : "block w-full rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-semibold text-zinc-700 hover:border-zinc-400";
    return viewAsNgoId ? (
      <Link href="/admin/dashboard?view=ngos" className={cls}>
        {mobile ? "← Admin" : "← Back to Admin"}
      </Link>
    ) : (
      <button onClick={handleSignOut} className={cls}>
        Sign Out
      </button>
    );
  }

  return (
    <aside className="border-b border-zinc-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center">
          <img src="/donatelink-logo.png" alt="DonateLink" className="h-[46px] w-auto" />
        </Link>
        <div className="md:hidden">{bottom(true)}</div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:overflow-visible">
        {tabs.map((m) => (
          <Link key={m.id} href={`${base}?view=${m.id}`} className={itemClass(active === m.id)}>
            <span>{m.icon}</span>
            <span>{m.label}</span>
            {badges[m.id] > 0 && (
              <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badges[m.id]}
              </span>
            )}
          </Link>
        ))}
        {extras.map((m) => (
          <Link key={m.id} href={m.href} className={itemClass(active === m.id)}>
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </Link>
        ))}
      </nav>

      <div className="hidden px-3 pb-4 md:block">{bottom(false)}</div>
    </aside>
  );
}
