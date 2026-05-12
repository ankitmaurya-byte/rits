"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-6 bg-white dark:bg-zinc-950">
          <div className="font-semibold text-zinc-800 dark:text-zinc-100">Rits</div>
          <UserButton />
        </header>
        <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-900">
          {children}
        </main>
      </div>
    </div>
  );
}
