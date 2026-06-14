import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

const CATEGORIES = ["General", "Bug", "Suggestion", "Complaint"];

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function FeedbackForm({ onSubmitted }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null); // { id, role, name, email }
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (active) setLoading(false);
        return;
      }
      const { data: row } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setProfile({
        id: session.user.id,
        role: row?.role || session.user.user_metadata?.role || "donor",
        name: row?.name || session.user.user_metadata?.name || "",
        email: session.user.email || "",
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setOkMsg("");
    setErrorMsg("");

    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg("Please write at least 10 characters.");
      return;
    }
    if (!profile) {
      setErrorMsg("Please sign in to send feedback.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: profile.id,
      role: profile.role,
      name: profile.name || null,
      email: profile.email || null,
      category,
      message: message.trim(),
    });
    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }
    setMessage("");
    setCategory("General");
    setSaving(false);
    setOkMsg("Thanks! Your feedback has been sent.");
    if (onSubmitted) onSubmitted();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {okMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {okMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-zinc-700">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-zinc-700">
          Your feedback
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's working, what's broken, or what you'd like to see."
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Sending..." : "Send Feedback"}
      </button>
    </form>
  );
}
