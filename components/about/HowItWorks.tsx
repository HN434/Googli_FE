import { Video, FlaskConical, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Video,
      title: "Upload",
      description: "Simply upload a video of your batting or bowling. Our system is designed for ease-of-use and quick turnarounds.",
    },
    {
      icon: FlaskConical,
      title: "Analyse",
      description: "Our top-notch AI models perform a complex analysis in seconds, breaking down your technique frame by frame.",
    },
    {
      icon: TrendingUp,
      title: "Improve",
      description: "Receive a detailed report with key observations, improvement areas and personalised drills. Chat with our AI coach to get one-on-one simulated or practice or watch key match replays.",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="bg-[#0f1f3a] border border-gray-800 rounded-lg p-8 hover:border-emerald-500/50 transition-all duration-300 group"
              >
                <div className="mb-6">
                  <Icon className="w-12 h-12 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-emerald-400 text-xl font-semibold mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
