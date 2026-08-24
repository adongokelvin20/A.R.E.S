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
  title: "A.R.E.S. -- Digital Employee for Your Business | Kevtech Corporation",
  description:
    "A.R.E.S. by Kevtech Corporation is the digital employee for your business. It talks to customers on WhatsApp, takes orders, manages inventory, and runs operations -- so you can focus on what matters.",
  metadataBase: new URL("https://ares-two-eta.vercel.app"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "A.R.E.S.",
    "Kevtech",
    "Kevtech Corporation",
    "Business Operating System",
    "Digital Employee",
    "WhatsApp Assistant",
    "Business Automation",
    "Ghana Tech",
  ],
  authors: [{ name: "Kelvin Ayinbisa" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "A.R.E.S. -- Digital Employee for Your Business | Kevtech Corporation",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kevtech Corporation.",
    siteName: "A.R.E.S.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A.R.E.S. -- Digital Employee for Your Business",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kevtech Corporation.",
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
