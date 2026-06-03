"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Bell,
  LogOut,
  MessageSquare,
  Radar,
  Settings,
  Shield,
  User,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  const value = name.trim();
  if (!value) return "U";
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function ProfileMenu({ variant, collapsed = false }: { variant?: "sidebar"; collapsed?: boolean }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, {});

  const name =
    currentUser?.name ||
    clerkUser?.fullName ||
    clerkUser?.username ||
    "User";
  const email =
    currentUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const status = currentUser?.status?.trim();
  const image = currentUser?.image || clerkUser?.imageUrl || undefined;

  const triggerContent =
    variant === "sidebar" ? (
      <button
        type="button"
        title={collapsed ? name : undefined}
        aria-label={collapsed ? name : undefined}
        className={`flex w-full items-center rounded-lg py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-2"
        }`}
        style={{ backgroundColor: "transparent" }}
      >
        <Avatar className="size-7 shrink-0" size="sm">
          <AvatarImage src={image} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        {!collapsed ? <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-tight truncate" style={{ color: "var(--ink)" }}>
            {name}
          </p>
          <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: "var(--mute)" }}>
            {status || email}
          </p>
        </div> : null}
      </button>
    ) : (
      <button
        type="button"
        className="flex items-center gap-3 rounded-full px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none"
        style={{ backgroundColor: "transparent" }}
      >
        <div className="hidden md:block">
          <p className="text-sm font-medium leading-tight" style={{ color: "var(--ink)" }}>
            {name}
          </p>
          <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--mute)" }}>
            {status || email}
          </p>
        </div>
        <Avatar className="size-9" size="default">
          <AvatarImage src={image} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerContent}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-64 rounded-2xl p-1.5 shadow-2xl ring-0"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface-card) 92%, transparent)",
          backdropFilter: "blur(18px)",
          border: "none",
          boxShadow: "0 18px 50px rgba(0, 0, 0, 0.28)",
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User size={14} />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <Radar size={14} />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings?tab=account">
              <Shield size={14} />
              Manage account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings size={14} />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/feedback">
              <MessageSquare size={14} />
              Feedback
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[var(--hairline)] opacity-50" />

        {/* Notifications */}
        <DropdownMenuItem className="relative">
          <Bell size={14} />
          Notifications
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: "var(--accent-red)" }}
          />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--hairline)] opacity-50" />

        <div className="flex items-center justify-between px-3 py-2 text-sm" style={{ color: "var(--ink)" }}>
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <DropdownMenuSeparator className="bg-[var(--hairline)] opacity-50" />

        <DropdownMenuItem
          onSelect={async (event) => {
            event.preventDefault();
            await signOut({ redirectUrl: "/" });
            router.push("/");
          }}
          variant="destructive"
        >
          <LogOut size={14} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
