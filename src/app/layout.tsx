import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/store/providers";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Labmove",
    template: "%s · Labmove",
  },
  description:
    "Labmove — บริการเจาะเลือดที่บ้าน ช่วยให้ผู้ใช้จองนัดเจาะเลือดที่บ้านได้อย่างรวดเร็วและเชื่อมต่อผ่าน LINE",
  applicationName: "Labmove",
  authors: [{ name: "Labmove" }],
  creator: "Ra1nningDay",
  keywords: ["labmove", "home blood draw", "booking", "LINE", "health"],

  openGraph: {
    title: "Labmove — เจาะเลือดที่บ้าน",
    description:
      "จองนัดเจาะเลือดที่บ้านอย่างรวดเร็วและปลอดภัย ผ่านการเชื่อมต่อกับ LINE",
    url: "/",
    siteName: "Labmove",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Labmove" }],
    locale: "th_TH",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Maps hosts to speed up first tile fetch */}
        <link rel="preload" as="image" href="/map-placeholder.svg" />
        <link
          rel="preconnect"
          href="https://maps.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://maps.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://mapsresources-pa.googleapis.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
        <link
          rel="dns-prefetch"
          href="https://mapsresources-pa.googleapis.com"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
