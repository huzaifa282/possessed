import type { Metadata } from "next";
import "./globals.css";

// Fonts must be bundled locally (no CDN): add @fontsource packages in task T3.2.
export const metadata: Metadata = {
  title: "Possessed",
  description: "Paste a UI component and a ghost designer possesses it: spooky code plus a live preview, powered by open-weight Gemma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
