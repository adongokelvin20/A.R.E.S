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
  title: "A.R.E.S. — The Digital Employee for Your Business | Kevtech Corporation",
  description:
    "A.R.E.S. by Kevtech Corporation is a digital employee for your business. It talks to customers on WhatsApp, takes orders, manages inventory, and runs operations — so you can focus on what matters. Founded by Kelvin Ayinbisa.",
  keywords: [
    "A.R.E.S.",
    "Kevtech",
    "Kevtech Corporation",
    "Kelvin Ayinbisa",
    "Business Operating System",
    "Digital Employee",
    "WhatsApp Business",
    "Business Automation",
    "Ghana Business",
  ],
  authors: [{ name: "Kelvin Ayinbisa" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "A.R.E.S. — The Digital Employee for Your Business | Kevtech Corporation",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Founded by Kelvin Ayinbisa. Built by Kevtech Corporation.",
    siteName: "A.R.E.S.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A.R.E.S. — The Digital Employee for Your Business",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Founded by Kelvin Ayinbisa.",
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
