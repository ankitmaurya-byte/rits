import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Rits  Research in tech startup",
  description:
    "Research briefs, analysis systems, consultant-grade notes, and AI-assisted evaluation in one operating layer",
  icons: {
    icon: "/rits_brand_logo_assets/rits_only_logo_transparent_background_text_dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <Providers>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "13px",
                borderRadius: "10px",
                border: "1px solid #e3e8ef",
                boxShadow:
                  "0 8px 32px rgba(10 37 64 / 0.12), 0 2px 8px rgba(10 37 64 / 0.06)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
