import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import PasswordInput from "@/components/PasswordInput";
import PhoneInput from "@/components/PhoneInput";
import supabase from "@/utils/supabase";

export default function UserSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("name, phone, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setUserId(session.user.id);
      setEmail(session.user.email);
      setName(profile?.name || session.user.user_metadata?.name || "");
      setPhone(profile?.phone || "");
      setAvatarUrl(profile?.avatar_url || "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFilePreview(f ? URL.createObjectURL(f) : "");
  }

  async function handleSave(e) {
    e.preventDefault();
    setOkMsg("");
    setErrorMsg("");
    setSaving(true);

    let newAvatarUrl = avatarUrl;

    if (file) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setErrorMsg(`Avatar upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }
      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error: profErr } = await supabase
      .from("users")
      .update({ name: name.trim(), phone: phone.trim() || null, avatar_url: newAvatarUrl || null })
      .eq("id", userId);
    if (profErr) {
      setErrorMsg(profErr.message);
      setSaving(false);
      return;
    }

    const authUpdate = { data: { name: name.trim() } };
    if (newPassword) authUpdate.password = newPassword;
    const { error: authErr } = await supabase.auth.updateUser(authUpdate);
    if (authErr) {
      setErrorMsg(authErr.message);
      setSaving(false);
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setFile(null);
    setFilePreview("");
    setNewPassword("");
    setOkMsg("Saved.");
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  const previewUrl = filePreview || avatarUrl;

  return (
    <form onSubmit={handleSave} className="space-y-5">
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

      <div className="flex items-center gap-4">
        <Avatar src={previewUrl} name={name} size="xl" />
        <div>
          <label className="inline-block cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
            {file ? "Change file" : "Upload profile image"}
          </label>
          {file && (
            <p className="mt-1 text-xs text-zinc-500">{file.name}</p>
          )}
          {avatarUrl && !file && (
            <button
              type="button"
              onClick={() => {
                setAvatarUrl("");
              }}
              className="ml-2 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email <span className="text-zinc-400">(locked)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
          Phone Number
        </label>
        <PhoneInput
          id="phone"
          value={phone}
          onChange={setPhone}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700">
          Change Password <span className="text-zinc-400">(optional)</span>
        </label>
        <PasswordInput
          id="newPassword"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
