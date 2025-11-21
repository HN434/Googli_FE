import { Video, MessageSquare, Radio, TrendingUp, Zap, Box } from "lucide-react";

export default function KeyFeatures() {
  const features = [
    {
      icon: Video,
      title: "Video Technique Analysis",
      description: "Upload your cricket videos to identify strengths of your performance & identify key moments with AI-powered insights.",
    },
    {
      icon: MessageSquare,
      title: "AI Coaching Chat",
      description: "Get instant answers to your cricket questions, strategy advice, or feedback on your recorded videos.",
    },
    {
      icon: Radio,
      title: "Live Commentary Simulation",
      description: "Experience AI-generated live commentary that mimics real commentators to analyze live games and player stats.",
    },
    // {
    //   icon: TrendingUp,
    //   title: "Match Prediction",
    //   description: "Get real-time predictions on match outcomes, player performance, and game-changing moments.",
    // },
    {
      icon: Zap,
      title: "Power-by-Frame Engine",
      description: "Advanced frame-by-frame analysis powered by cutting-edge AI models for precise cricket insights.",
    },
    // {
    //   icon: Box,
    //   title: "3D Visualization",
    //   description: "View ball trajectory in 3D, player positioning analysis, and interactive match visualizations.",
    // },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-[#0f1f3a]">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
          KEY FEATURES
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-[#1a2942] border border-gray-700 rounded-xl p-6 hover:border-emerald-500 transition-colors group"
              >
                <div className="mb-5">
                  <Icon className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
