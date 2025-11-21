import { Button } from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 bg-gray-900">
      <div className="container mx-auto text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Cricket Intelligence
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Real-time video analysis, multi-modal insights, voice commentary and AI-intelligent feedback for cricket coaches and fans.
        </p>
        <Button variant="primary" className="text-lg px-8 py-3">
          Preview - Give It a Try! →
        </Button>
      </div>
    </section>
  );
}
