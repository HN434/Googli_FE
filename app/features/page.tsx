import { Metadata } from "next";
import FeaturesHero from "@/components/features/FeaturesHero";
import FeaturesTabs from "@/components/features/FeaturesTabs";

export const metadata: Metadata = {
  title: "Features - Googli.ai | AI-Powered Cricket Analysis",
  description: "Explore Googli.ai's powerful features: Video Analysis, Live Commentary, and Match Predictions powered by advanced AI.",
  keywords: ["cricket video analysis", "AI commentary", "match predictions", "cricket features"],
  openGraph: {
    title: "Features - Googli.ai | AI-Powered Cricket Analysis",
    description: "Explore Googli.ai's powerful features: Video Analysis, Live Commentary, and Match Predictions.",
    type: "website",
  },
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      <FeaturesHero />
      <FeaturesTabs />
    </main>
  );
}
