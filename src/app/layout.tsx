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
  title: "ChatBiz — The Digital Employee for Your Business | Kevtech Corporation",
  description:
    "ChatBiz by Kevtech Corporation is a digital employee for your business. It talks to customers on your store link, takes orders, manages inventory, and runs operations — so you can focus on what matters. Built by Kelvin Ayinbisa & Jessy in partnership.",
  keywords: [
    "ChatBiz",
    "Kevtech",
    "Kevtech Corporation",
    "Kelvin Ayinbisa",
    "Jessy",
    "Business Operating System",
    "Digital Employee",
    "Business Automation",
    "Ghana Business",
  ],
  authors: [{ name: "Kelvin Ayinbisa & Jessy" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "ChatBiz — The Digital Employee for Your Business | Kevtech Corporation",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jessy in partnership.",
    siteName: "ChatBiz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatBiz — The Digital Employee for Your Business",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jessy.",
  },
  verification: {
    google: "PvZ3IyZSp1P7oEExJ8BTg3aha6VV6laEEYO-slzlRs8",
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
