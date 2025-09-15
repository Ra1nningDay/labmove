import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/store/providers";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  colorScheme: "light",
  openGraph: {
    title: "Labmove — เจาะเลือดที่บ้าน",
    description:
      "จองนัดเจาะเลือดที่บ้านอย่างรวดเร็วและปลอดภัย ผ่านการเชื่อมต่อกับ LINE",
    url: process.env.PUBLIC_BASE_URL || "https://labmove.local",
    siteName: "Labmove",
    images: ["/file.svg"],
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleMapsProvider>
          <AppStoreProvider>{children}</AppStoreProvider>
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
