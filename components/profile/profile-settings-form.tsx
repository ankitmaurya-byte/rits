"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Building2, LogOut, MessageSquare, Save, User } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

type SettingsTab = "profile" | "account";

export function ProfileSettingsForm({ tab }: { tab: SettingsTab }) {
  const { signOut } = useClerk();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const updateProfile = useMutation(api.users.updateCurrentUserProfile);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [bio, setBio] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? "");
    setStatus(currentUser.status ?? "");
    setCurrentCompany(currentUser.currentCompany ?? "");
    setBio(currentUser.bio ?? "");
    setDescription(currentUser.description ?? "");
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name,
        status,
        bio,
        description,
        currentCompany,
      });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (currentUser === undefined) {
    return <div className="skeleton h-96 rounded-2xl" />;
  }

  const filledProfileFields = [
    currentUser?.name,
    currentUser?.email,
    currentUser?.status,
    currentUser?.bio,
    currentUser?.description,
    currentUser?.currentCompany,
  ].filter((value) => value?.trim()).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
      <aside className="feature-card h-fit space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Settings</p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>
            Account center
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
            Manage how your profile appears inside Rits and keep your account actions in one place.
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href="/settings"
            className="rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === "profile" ? "var(--surface-elevated)" : "transparent",
              color: "var(--ink)",
            }}
          >
            <div>Profile settings</div>
            <div className="mt-1 text-xs font-normal" style={{ color: "var(--mute)" }}>
              Name, company, status, bio, and description
            </div>
          </Link>
          <Link
            href="/settings?tab=account"
            className="rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === "account" ? "var(--surface-elevated)" : "transparent",
              color: "var(--ink)",
            }}
          >
            <div>Account</div>
            <div className="mt-1 text-xs font-normal" style={{ color: "var(--mute)" }}>
              Identity, access, and quick actions
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--surface-deep)" }}>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Profile</p>
            <p className="mt-2 text-2xl font-medium" style={{ color: "var(--ink)" }}>{filledProfileFields}/6</p>
            <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>fields filled</p>
          </div>
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--surface-deep)" }}>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Identity</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
              {currentUser?.email ? "Verified" : "Missing"}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>email connected</p>
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Display name</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{currentUser?.name || "User"}</p>
          </div>
          <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Current company</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{currentUser?.currentCompany?.trim() || "Not set"}</p>
          </div>
          <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Status</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{currentUser?.status?.trim() || "No status"}</p>
          </div>
        </div>

        <div className="rounded-3xl p-1" style={{ backgroundColor: "var(--surface-card)" }}>
          <div className="rounded-[22px] p-6" style={{ backgroundColor: "var(--surface-card)" }}>
            {tab === "profile" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Profile settings</h2>
                  <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>
                    Update the details your workspace sees when they open your profile.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Full name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Current company</span>
                    <input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} className="input-field" placeholder="Acme Labs" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Email</span>
                    <input value={currentUser?.email ?? ""} readOnly className="input-field opacity-70" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Status</span>
                    <input value={status} onChange={(e) => setStatus(e.target.value)} className="input-field" placeholder="Building quietly this week" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Bio</span>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field min-h-28 resize-y py-3" placeholder="Short introduction for your profile." />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Description</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-40 resize-y py-3" placeholder="Role, domain expertise, what you're working on, and how others should collaborate with you." />
                  </label>
                </div>

                <div className="flex justify-end border-t pt-5" style={{ borderColor: "var(--divider-soft)" }}>
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    <Save size={16} />
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Manage account</h2>
                    <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>
                      Review your account identity and use the app-level actions below.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-deep)" }}>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Email</p>
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{currentUser?.email ?? "-"}</p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-deep)" }}>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Clerk ID</p>
                      <p className="mt-2 break-all text-sm font-medium" style={{ color: "var(--ink)" }}>{currentUser?.clerkId ?? "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Quick actions</h3>
                  <Link href="/profile" className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-elevated)]" style={{ backgroundColor: "var(--surface-deep)", color: "var(--body)" }}>
                    <User size={16} /> View profile
                  </Link>
                  <Link href="/feedback" className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-elevated)]" style={{ backgroundColor: "var(--surface-deep)", color: "var(--body)" }}>
                    <MessageSquare size={16} /> Send feedback
                  </Link>
                  <button onClick={() => signOut({ redirectUrl: "/" })} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-elevated)]" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-red)" }}>
                    <LogOut size={16} /> Logout
                  </button>
                  <p className="pt-3 text-xs" style={{ color: "var(--mute)" }}>
                    Login identity and verified email are controlled by your authentication provider.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
