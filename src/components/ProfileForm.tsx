"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileFormLabels = {
  displayName: string;
  email: string;
  language: string;
  english: string;
  chinese: string;
  etransferEmail: string;
  etransferHelp: string;
  role: string;
  member: string;
  admin: string;
  roleValue: "member" | "admin";
  save: string;
  saving: string;
  saved: string;
  error: string;
  avatar: string;
  avatarEmoji: string;
  avatarUpload: string;
  avatarRemove: string;
  useInitial: string;
};

type Props = {
  userId: string;
  email: string;
  initialDisplayName: string;
  initialLanguage: "en" | "zh-TW";
  initialEtransferEmail: string | null;
  initialAvatarUrl: string | null;
  initialAvatarEmoji: string | null;
  labels: ProfileFormLabels;
  locale: string;
};
export function ProfileForm({ locale, userId, email, initialDisplayName, initialLanguage, initialEtransferEmail, initialAvatarUrl, initialAvatarEmoji, labels }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [language, setLanguage] = useState(initialLanguage);
  const [etransferEmail, setEtransferEmail] = useState(initialEtransferEmail ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [avatarEmoji, setAvatarEmoji] = useState(initialAvatarEmoji ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const EMOJIS = [
    // Christmas / holiday
    "🎄", "🎅", "🤶", "🎁", "🎀", "❄️", "⛄", "🔔", "🕯️", "⭐", "✨", "🎉", "🎊", "🥂",
    // Tech / work
    "🧑‍💻", "👩‍💻", "💻", "⌨️", "🖥️", "📱", "🚀", "💡", "🔥", "⚡", "🧠", "📊", "🔧", "🛠️",
    // Food / drink
    "☕", "🍵", "🧋", "🍕", "🍜", "🍔", "🍰", "🧁", "🍩", "🍦",
    // Fun / nature
    "🎨", "📚", "🎵", "🎬", "⚽", "🏀", "🎮", "🌸", "🌈", "🍁", "🌙", "☀️",
    // Animals
    "🐱", "🐶", "🦊", "🐼", "🦄", "🐧", "🦉", "🐢",
  ];


  function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("The image must be 2 MB or smaller.");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarEmoji("");
  }

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");
    const supabase = createClient();
    let avatarUrlToSave = avatarUrl || null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const avatarPath = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, avatarFile, { upsert: true });
      if (uploadError) {
        setError(uploadError.message || labels.error);
        setIsSaving(false);
        return;
      }
      avatarUrlToSave = supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
    }


    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        preferred_language: language,
        etransfer_email: etransferEmail.trim() || null,
        avatar_url: avatarUrlToSave,
        avatar_emoji: avatarEmoji || null,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message || labels.error);
      setIsSaving(false);
    } else {
      setMessage(labels.saved);
      setIsSaving(false);
      setTimeout(() => {
        window.location.assign(`/${locale}`);
      }, 1500);
    }

  }

  const fieldClass = "mt-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal";
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <p className="text-sm font-bold">{labels.avatar}</p>
        <div className="mt-2 flex items-center gap-4">
          {avatarPreview || avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarPreview || avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : avatarEmoji ? (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-teal/15 text-3xl">{avatarEmoji}</span>
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-teal/15 text-xl font-bold text-teal-d">{displayName.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-bold text-teal-d">
              {labels.avatarUpload}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
            </label>
            {(avatarUrl || avatarPreview) && (
              <button type="button" onClick={() => { setAvatarUrl(""); setAvatarFile(null); setAvatarPreview(null); }} className="text-left text-sm font-bold text-red-700">{labels.avatarRemove}</button>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm font-bold">{labels.avatarEmoji}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => { setAvatarEmoji(emoji); setAvatarUrl(""); setAvatarFile(null); setAvatarPreview(null); }} className={`grid h-10 w-10 place-items-center rounded-full border text-xl ${avatarEmoji === emoji ? "border-teal bg-teal/15" : "border-line bg-white"}`}>{emoji}</button>
          ))}
        </div>
        {(avatarEmoji || avatarUrl || avatarPreview) && (
          <button type="button" onClick={() => { setAvatarEmoji(""); setAvatarUrl(""); setAvatarFile(null); setAvatarPreview(null); }} className="mt-3 text-sm font-bold text-purple underline-offset-4 hover:underline">
            {labels.useInitial}
          </button>
        )}
      </div>

      <label className="block text-sm font-bold">{labels.displayName}<input required minLength={1} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClass} /></label>
      <label className="block text-sm font-bold">{labels.email}<input type="email" value={email} readOnly className={`${fieldClass} bg-bg2 text-muted`} /></label>
      <label className="block text-sm font-bold">{labels.language}<select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "zh-TW")} className={`${fieldClass} bg-white`}><option value="en">{labels.english}</option><option value="zh-TW">{labels.chinese}</option></select></label>
      <label className="block text-sm font-bold">{labels.etransferEmail}<span className="mt-1 block text-xs font-normal text-muted">{labels.etransferHelp}</span><input type="email" value={etransferEmail} onChange={(event) => setEtransferEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} /></label>
      <div className="flex items-center justify-between rounded-xl bg-bg2 px-4 py-3"><span className="text-sm font-bold">{labels.role}</span><span className="rounded-full bg-chip px-3 py-1 text-xs font-bold">{labels.roleValue === "admin" ? labels.admin : labels.member}</span></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p>}
      <button disabled={isSaving} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold text-white disabled:opacity-60">{isSaving ? labels.saving : labels.save}</button>
    </form>
  );
}
