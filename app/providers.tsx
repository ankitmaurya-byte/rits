"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { ThemeProvider } from "next-themes";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" themes={['light', 'dark', 'solarized-light', 'solarized-dark']}>
          {children}
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}