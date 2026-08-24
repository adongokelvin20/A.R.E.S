import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AresSessionProvider } from "@/components/ares/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A.R.E.S. -- AI Employee for Your Business | Kevtech Corporation",
  description:
    "A.R.E.S. by Kevtech Corporation is the AI employee for your business. It talks to customers on WhatsApp, takes orders, manages inventory, and runs operations -- so you can focus on what matters.",
  keywords: [
    "A.R.E.S.",
    "Kevtech",
    "Kevtech Corporation",
    "AI Business Operating System",
    "AI Employee",
    "WhatsApp AI",
    "Business Automation",
    "Ghana AI",
  ],
  authors: [{ name: "Kelvin" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "A.R.E.S. -- AI Employee for Your Business | Kevtech Corporation",
    description:
      "The AI employee that talks to customers, takes orders, and runs your business. Built by Kevtech Corporation.",
    siteName: "A.R.E.S.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A.R.E.S. -- AI Employee for Your Business",
    description:
      "The AI employee that talks to customers, takes orders, and runs your business. Built by Kevtech Corporation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AresSessionProvider>{children}</AresSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
