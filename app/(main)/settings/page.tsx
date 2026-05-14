"use client";

import { useSearchParams } from "next/navigation";

import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "account" ? "account" : "profile";

  return (
    <div className="page-container animate-fade-in-up">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Preferences</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>
          Settings
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
          Keep your public profile polished, manage your account identity, and move quickly between profile and feedback.
        </p>
      </div>
      <ProfileSettingsForm tab={tab} />
    </div>
  );
}
