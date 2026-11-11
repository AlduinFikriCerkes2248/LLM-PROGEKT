import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthStatusIndicator from "./auth-status-indicator";
import SideWaves from "./side-waves";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MATCHDAY - Футбольні прогнози",
  description: "Змагайтеся у футбольних прогнозах з друзями без реальних ставок",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050813] relative overflow-x-hidden">
        <SideWaves />
        <AuthStatusIndicator />
        {children}
      </body>
    </html>
  );
}
