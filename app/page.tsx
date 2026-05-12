"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  if (isLoaded && isSignedIn) {
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 sm:items-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-black dark:text-zinc-50">
            Welcome to Startup OS
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            The all-in-one workspace for your startup. Manage ideas, tasks, and notes in one unified platform.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-10">
          <SignInButton mode="modal">
            <Button size="lg" variant="outline">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="lg">Get Started</Button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}
