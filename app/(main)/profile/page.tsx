"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Building2, Mail, MessageSquare, PencilLine } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string) {
  const value = name.trim();
  if (!value) return "U";
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, {});

  if (currentUser === undefined) {
    return <div className="page-container"><div className="skeleton h-96 rounded-2xl" /></div>;
  }

  const name = currentUser?.name || clerkUser?.fullName || clerkUser?.username || "User";
  const email = currentUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const status = currentUser?.status?.trim();
  const image = currentUser?.image || clerkUser?.imageUrl || undefined;

  return (
    <div className="page-container animate-fade-in-up">
      <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="feature-card relative overflow-hidden">
          <div className="absolute right-0 top-0 h-48 w-48 pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent-blue) 0%, transparent 70%)", opacity: 0.14 }} />
          <div className="relative z-10 flex flex-col items-start gap-6">
            <Avatar className="size-24" size="lg">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>{name}</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>{status || "Add a status in settings so teammates know what you are focused on."}</p>
            </div>
            <div className="space-y-3 text-sm" style={{ color: "var(--body)" }}>
              <div className="flex items-center gap-2"><Mail size={15} /> {email}</div>
              <div className="flex items-center gap-2"><Building2 size={15} /> {currentUser?.currentCompany?.trim() || "No current company added"}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="btn-primary"><PencilLine size={16} /> Edit settings</Link>
              <Link href="/feedback" className="btn-outline"><MessageSquare size={16} /> Feedback</Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="feature-card">
            <h2 className="text-lg font-medium mb-3" style={{ color: "var(--ink)" }}>Bio</h2>
            <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: "var(--charcoal)" }}>
              {currentUser?.bio?.trim() || "No bio added yet."}
            </p>
          </div>

          <div className="feature-card">
            <h2 className="text-lg font-medium mb-3" style={{ color: "var(--ink)" }}>Description</h2>
            <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: "var(--charcoal)" }}>
              {currentUser?.description?.trim() || "No description added yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
