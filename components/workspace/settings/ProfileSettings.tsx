"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { AvatarCropModal } from "./AvatarCropModal";

interface Props {
  profile: Profile;
  userEmail: string;
  userId: string;
}

interface ApplyState {
  loading: boolean;
  success: string | null;
  error: string | null;
}

const idle: ApplyState = { loading: false, success: null, error: null };

export function ProfileSettings({ profile, userEmail, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar — immediate upload via crop modal (independent of Apply)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarState, setAvatarState] = useState<ApplyState>(idle);

  // Editable fields
  const [displayName, setDisplayName] = useState(profile.name);
  const [savedName, setSavedName] = useState(profile.name);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Section-level apply
  const [applyState, setApplyState] = useState<ApplyState>(idle);

  const nameChanged = displayName !== savedName;
  const passwordDirty = newPassword.length > 0;
  const isDirty = nameChanged || passwordDirty;

  // ── Avatar flow ──────────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      setAvatarState({ loading: false, success: null, error: "File exceeds 10 MB limit." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropApply(blob: Blob) {
    setAvatarState({ loading: true, success: null, error: null });
    const filePath = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setAvatarState({ loading: false, success: null, error: uploadError.message });
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: bustedUrl })
      .eq("id", userId);

    if (updateError) {
      setAvatarState({ loading: false, success: null, error: updateError.message });
      throw updateError;
    }

    setAvatarUrl(bustedUrl);
    setAvatarState({ loading: false, success: "Avatar updated.", error: null });
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    router.refresh();
    setTimeout(() => setAvatarState(idle), 3000);
  }

  // ── Section Apply ────────────────────────────────────────────────────────────

  async function handleApply() {
    // Validate password if user typed anything
    if (passwordDirty) {
      if (newPassword.length < 8) {
        setApplyState({ loading: false, success: null, error: "Password must be at least 8 characters." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setApplyState({ loading: false, success: null, error: "Passwords do not match." });
        return;
      }
    }

    setApplyState({ loading: true, success: null, error: null });

    const errors: string[] = [];

    await Promise.all([
      nameChanged
        ? supabase.from("profiles").update({ name: displayName.trim() }).eq("id", userId)
            .then((res) => { if (res.error) errors.push(res.error.message); })
        : Promise.resolve(),
      passwordDirty
        ? supabase.auth.updateUser({ password: newPassword })
            .then(({ error }) => { if (error) errors.push(error.message); })
        : Promise.resolve(),
    ]);

    if (errors.length > 0) {
      setApplyState({ loading: false, success: null, error: errors[0] });
      return;
    }

    // Success
    if (nameChanged) setSavedName(displayName.trim());
    if (passwordDirty) {
      setNewPassword("");
      setConfirmPassword("");
    }
    setApplyState({ loading: false, success: "Changes saved.", error: null });
    router.refresh();
    setTimeout(() => setApplyState(idle), 3000);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onCancel={handleCropCancel}
          onApply={handleCropApply}
        />
      )}

      <div className="space-y-8">
        {/* Avatar */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avatar</h3>
          <div className="flex items-center gap-5">
            <div className="relative group flex-shrink-0">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl ?? undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {getInitials(displayName || profile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarState.loading}
                className={cn(
                  "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity",
                  avatarState.loading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                {avatarState.loading
                  ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                  : <Camera className="h-5 w-5 text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>Click the avatar to upload a new photo.</p>
              <p className="text-xs">Accepts JPG, PNG, GIF. Max 10 MB.</p>
            </div>
          </div>
          {avatarState.success && (
            <p className="flex items-center gap-1.5 text-xs text-green-500">
              <Check className="h-3 w-3" /> {avatarState.success}
            </p>
          )}
          {avatarState.error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> {avatarState.error}
            </p>
          )}
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</h3>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="max-w-sm"
          />
        </div>

        {/* Email — read-only */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</h3>
          <Input
            value={userEmail}
            readOnly
            className="max-w-sm bg-muted/40 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Managed by Supabase Auth. Change email directly in your Supabase account settings.
          </p>
        </div>

        {/* Change password */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Password</h3>
          <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
          <div className="space-y-2 max-w-sm">
            <Input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Section Apply */}
        <div className="pt-4 border-t border-border space-y-2">
          <Button
            onClick={handleApply}
            disabled={!isDirty || applyState.loading}
            className="gap-2"
          >
            {applyState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Changes"}
          </Button>
          {applyState.success && (
            <p className="flex items-center gap-1.5 text-xs text-green-500">
              <Check className="h-3 w-3" /> {applyState.success}
            </p>
          )}
          {applyState.error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> {applyState.error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
