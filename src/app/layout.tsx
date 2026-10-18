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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ChattBiz — The Digital Employee for Your Business | Kevtech Corporation",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jesse in partnership.",
    siteName: "ChattBiz",
    type: "website",
    url: "https://www.chattbiz.com",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ChattBiz Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChattBiz — The Digital Employee for Your Business",
    description:
      "The digital employee that talks to customers, takes orders, and runs your business. Built by Kelvin Ayinbisa & Jesse.",
    images: ["/logo.png"],
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
  // JSON-LD structured data — tells Google the official logo for search results
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ChattBiz",
    alternateName: "Kevtech Corporation",
    url: "https://www.chattbiz.com",
    logo: "https://www.chattbiz.com/logo.png",
    description: "ChattBiz is a digital employee for your business. It talks to customers on your store link, takes orders, manages inventory, and runs operations.",
    founders: [
      { "@type": "Person", name: "Kelvin Ayinbisa" },
      { "@type": "Person", name: "Jesse" },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ChattBiz",
    url: "https://www.chattbiz.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.chattbiz.com/store?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AresSessionProvider>{children}</AresSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
