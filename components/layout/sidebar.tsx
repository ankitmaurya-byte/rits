"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ideas", label: "Ideas" },
  { href: "/todos", label: "Todos" },
  { href: "/notes", label: "Notes" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-4 border-b h-14 flex items-center">
        <span className="font-bold text-lg tracking-tight">RITS App</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}