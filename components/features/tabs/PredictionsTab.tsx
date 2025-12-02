import { Button } from "@/components/ui/Button";
import StickmanViewer from "./StickmanViewer";
import AnimatedModelViewer from "./CricketModel";

export default function PredictionsTab() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-3">
          Cricket 3D Analysis
        </h2>
        <p className="text-gray-400 text-sm">
          Get AI-powered predictions for match outcomes and player performance
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Pass the path to the mock file in /public */}
          {/* <StickmanViewer dataUrl="/mock_cricket.json" /> */}
          <AnimatedModelViewer />
        </div>
      </div>
    </div>
  );
}
