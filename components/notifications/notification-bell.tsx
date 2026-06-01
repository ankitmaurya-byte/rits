"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const notifications = useQuery(api.notifications.getNotifications, { userId: userId as Id<"users"> });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const [isOpen, setIsOpen] = useState(false);

  if (!notifications) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-1.5 rounded-md hover:bg-[var(--surface-elevated)] transition-colors text-[var(--mute)] hover:text-[var(--ink)]">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[var(--accent-red)]"></span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" style={{ backgroundColor: "var(--surface-deep)" }}>
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--hairline-strong)" }}>
          <span className="text-sm font-semibold text-[var(--ink)]">Notifications</span>
          {unreadCount > 0 && (
            <button 
              onClick={() => markAllAsRead({ userId: userId as Id<"users"> })}
              className="text-[10px] text-[var(--accent-blue)] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--mute)]">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif._id} 
                className={`p-3 border-b text-sm cursor-pointer transition-colors hover:bg-[var(--surface-elevated)] flex flex-col gap-1 ${notif.isRead ? 'opacity-70' : 'bg-[var(--surface-card)]'}`}
                style={{ borderColor: "var(--hairline)" }}
                onClick={() => {
                  if (!notif.isRead) markAsRead({ id: notif._id });
                  if (notif.link) {
                    router.push(notif.link);
                    setIsOpen(false);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[var(--ink)]">{notif.title}</span>
                  {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] shrink-0 mt-1"></span>}
                </div>
                <p className="text-xs text-[var(--charcoal)] leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-[var(--mute)]">{formatDistanceToNow(notif.createdAt)} ago</span>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
