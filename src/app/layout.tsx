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
  metadataBase: new URL("https://www.chattbiz.com"),
  title: "ChattBiz — The Digital Employee for Your Business | Kevtech Corporation",
  description:
    "ChattBiz by Kevtech Corporation is a digital employee for your business. It talks to customers on your store link, takes orders, manages inventory, and runs operations — so you can focus on what matters. Built by Kelvin Ayinbisa & Jesse in partnership.",
  keywords: [
    "ChattBiz",
    "Kevtech",
    "Kevtech Corporation",
    "Kelvin Ayinbisa",
    "Jesse",
    "Business Operating System",
    "Digital Employee",
    "Business Automation",
    "Ghana Business",
  ],
  authors: [{ name: "Kelvin Ayinbisa & Jesse" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "ChattBiz — The Digital Employee for Your Business | Kevtech Corporation",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jesse in partnership.",
    siteName: "ChattBiz",
    type: "website",
    url: "https://www.chattbiz.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChattBiz — The Digital Employee for Your Business",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jesse.",
  },
  verification: {
    google: "l6VHaDt8q5dJAirgzITnhp5CyChGRp12Tt3vsVWMjyQ",
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
