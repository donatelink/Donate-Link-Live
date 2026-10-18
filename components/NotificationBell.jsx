import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "@/utils/supabase";

const POLL_MS = 30000;

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Header bell: unread count, a dropdown of the latest notifications, and
// click-through to the page each one is about.
export default function NotificationBell({ className = "" }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null),
    ]);
    setItems(list.data || []);
    setUnread(count.count || 0);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Close when clicking anywhere outside the dropdown.
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function openItem(n) {
    setOpen(false);
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      load();
    }
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .is("read_at", null);
    load();
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
            <span className="text-sm font-semibold text-zinc-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`block w-full px-4 py-3 text-left hover:bg-zinc-50 ${n.read_at ? "" : "bg-emerald-50/60"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-zinc-600 line-clamp-2">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-zinc-400">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
