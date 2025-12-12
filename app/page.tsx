import { Metadata } from "next";
import { redirect } from "next/navigation";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Experience from "@/components/sections/Experience";
import KeyFeatures from "@/components/sections/KeyFeatures";
import VideoFeedback from "@/components/sections/VideoFeedback";
import FeaturesHero from "@/components/features/FeaturesHero";
import FeaturesTabs from "@/components/features/FeaturesTabs";

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
  // Redirect to features page
  // redirect('/features');
  // Commented out - Original home page content
  return (
    <main className="min-h-screen" suppressHydrationWarning>
      <Hero />
      <Stats />
      <Experience />
      <KeyFeatures />
      <VideoFeedback />
    </main>
    // <main className="min-h-screen bg-gray-900">
    //   <FeaturesHero />
    //   <FeaturesTabs />
    // </main>
  );
}
