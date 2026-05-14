"use client";

import { useSearchParams } from "next/navigation";

import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "account" ? "account" : "profile";

  return (
    <div className="page-container animate-fade-in-up">
      <ProfileSettingsForm tab={tab} />
    </div>
  );
}
