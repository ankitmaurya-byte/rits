"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  LogOut,
  Mail,
  MessageSquare,
  Settings,
  Shield,
  User,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  const value = name.trim();
  if (!value) return "U";
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function ProfileMenu() {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-elevated)]"
          style={{
            borderColor: "var(--hairline-strong)",
            backgroundColor: "var(--surface-card)",
          }}
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="size-10" size="lg">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
                {name}
              </p>
              <p className="truncate text-xs" style={{ color: "var(--mute)" }}>
                {email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User size={14} />
              Profile
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

        <DropdownMenuSeparator />

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
