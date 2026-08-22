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
  title: "Kevtech -- AI Business Operating System",
  description:
    "Kevtech gives your business an AI employee that talks to customers on WhatsApp, takes orders, manages inventory, and runs operations -- so you can focus on what matters.",
  keywords: [
    "Kevtech",
    "AI Business Operating System",
    "AI Employee",
    "WhatsApp AI",
    "Business Automation",
    "Ghana AI",
  ],
  authors: [{ name: "Kelvin Ayinbisa" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Kevtech -- AI Business Operating System",
    description:
      "Your AI employee for business. Talks to customers, takes orders, and runs operations.",
    siteName: "Kevtech",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kevtech -- AI Business Operating System",
    description:
      "Your AI employee for business. Talks to customers, takes orders, and runs operations.",
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
