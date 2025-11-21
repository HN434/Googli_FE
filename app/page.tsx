import { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Experience from "@/components/sections/Experience";
import KeyFeatures from "@/components/sections/KeyFeatures";
import VideoFeedback from "@/components/sections/VideoFeedback";

export const metadata: Metadata = {
  title: "Googli.ai - Cricket Intelligence Platform",
  description: "Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.",
  keywords: ["cricket", "AI", "video analysis", "coaching", "sports intelligence"],
  openGraph: {
    title: "Googli.ai - Cricket Intelligence Platform",
    description: "Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.",
    type: "website",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen" suppressHydrationWarning>
      <Hero />
      <Stats />
      <Experience />
      <KeyFeatures />
      <VideoFeedback />
    </main>
  );
}
