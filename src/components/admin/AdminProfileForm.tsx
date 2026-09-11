"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { cn } from "@/lib/utils";

const AVATAR_INPUT_ID = "admin-profile-avatar";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  image: string | null;
  roleLabel: string;
  staffCountry: string | null;
};

export function AdminProfileForm({ initial }: { initial: Profile }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initial);
  const [name, setName] = useState(initial.name || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save profile");
      setProfile((prev) => ({ ...prev, ...data.profile }));
      setMessage("Profile updated.");
      window.dispatchEvent(new CustomEvent("admin:profile-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProfile((prev) => ({ ...prev, image: data.profile.image }));
      setMessage("Profile photo updated.");
      window.dispatchEvent(new CustomEvent("admin:profile-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!profile.image) return;
    if (!confirm("Remove your profile photo?")) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("remove", "true");
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove photo");
      setProfile((prev) => ({ ...prev, image: null }));
      setMessage("Profile photo removed.");
      window.dispatchEvent(new CustomEvent("admin:profile-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,17rem)_1fr] gap-8 max-w-3xl">
      <AdminCard className="flex flex-col items-center text-center gap-4">
        <StaffAvatar
          name={profile.name}
          email={profile.email}
          image={profile.image}
          size="xl"
        />
        <div>
          <p className="font-medium text-[#03045e]">{profile.name || profile.email}</p>
          <p className="text-xs text-mocha mt-0.5">{profile.roleLabel}</p>
        </div>
        <input
          id={AVATAR_INPUT_ID}
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadPhoto(file);
          }}
        />
        {error ? <p className="text-sm text-red-600 w-full">{error}</p> : null}
        {message ? <p className="text-sm text-green-700 w-full">{message}</p> : null}
        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor={AVATAR_INPUT_ID}
            className={cn(
              "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
              "bg-white text-[#03045e] border border-[#03045e]/15 hover:border-[#03045e]/30 hover:bg-[#f7f6f3] active:scale-[0.98]",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {profile.image ? "Change photo" : "Upload photo"}
          </label>
          {profile.image ? (
            <AdminButton
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => void removePhoto()}
              className="w-full justify-center gap-2 text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </AdminButton>
          ) : null}
        </div>
        <p className="text-[11px] text-mocha leading-relaxed">
          JPG, PNG, or WebP · max 2MB. Shown on your admin profile and staff lists.
        </p>
      </AdminCard>

      <AdminCard>
        <form onSubmit={saveDetails} className="space-y-4">
          <AdminSectionTitle title="Account details" className="!mb-2" />
          <label className="block">
            <span className={adminLabelClass}>Email</span>
            <input value={profile.email} disabled className={adminInputClass} />
          </label>
          <label className="block">
            <span className={adminLabelClass}>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={adminInputClass}
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <span className={adminLabelClass}>Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={adminInputClass}
              placeholder="+233…"
            />
          </label>
          {profile.staffCountry ? (
            <p className="text-xs text-mocha">Country scope: {profile.staffCountry}</p>
          ) : null}
          <AdminButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save details"}
          </AdminButton>
        </form>
      </AdminCard>
    </div>
  );
}
