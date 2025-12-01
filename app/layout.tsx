import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingChatbot from "@/components/layout/FloatingChatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Googli.ai - Cricket Intelligence Platform",
  description: "Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.",
  keywords: ["cricket", "AI", "video analysis", "coaching", "sports intelligence", "googli.ai"],
  authors: [{ name: "Googli.ai Team" }],
  openGraph: {
    title: "Googli.ai - Cricket Intelligence Platform",
    description: "Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Googli.ai - Cricket Intelligence Platform",
    description: "Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
        <Footer />
        <FloatingChatbot />
      </body>
    </html>
  );
}
