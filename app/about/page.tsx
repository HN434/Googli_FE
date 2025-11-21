import { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";
import HowItWorks from "@/components/about/HowItWorks";
import Vision from "@/components/about/Vision";
import CallToAction from "@/components/about/CallToAction";

export const metadata: Metadata = {
  title: "About Us - Googli.ai | Revolutionise Cricket with AI",
  description: "Learn about Googli.ai's mission to bring elite-level analytics to every player, coach and fan through AI-powered cricket intelligence.",
  keywords: ["about googli.ai", "cricket AI", "mission", "vision", "cricket analytics"],
  openGraph: {
    title: "About Us - Googli.ai | Revolutionise Cricket with AI",
    description: "Learn about Googli.ai's mission to bring elite-level analytics to every player, coach and fan.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <AboutHero />
      <HowItWorks />
      <Vision />
      <CallToAction />
    </main>
  );
}
