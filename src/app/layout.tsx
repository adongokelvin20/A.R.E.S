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
  title: "A.R.E.S. -- Automated Routing and Execution System",
  description:
    "A.R.E.S. is a multi-tenant AI Business Operating System. A business signs up, A.R.E.S. learns what they do, and they receive an AI employee that communicates with customers, monitors operations, executes authorized actions, and runs the business with them.",
  keywords: [
    "A.R.E.S.",
    "Automated Routing and Execution System",
    "AI Business Operating System",
    "AI Employee",
    "WhatsApp AI",
    "Multi-tenant SaaS",
    "Business Automation",
    "Ghana AI",
  ],
  authors: [{ name: "Kelvin Ayinbisa" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "A.R.E.S. -- Automated Routing and Execution System",
    description:
      "Your AI employee for business. Multi-tenant AI Business Operating System with WhatsApp, automation, and a real command center for your operations.",
    siteName: "A.R.E.S.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A.R.E.S. -- Automated Routing and Execution System",
    description:
      "Your AI employee for business. Multi-tenant AI Business Operating System.",
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
