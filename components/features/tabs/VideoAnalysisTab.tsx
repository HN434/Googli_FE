import { Button } from "@/components/ui/Button";
import { Upload } from "lucide-react";

export default function VideoAnalysisTab() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-3">
          Video Technique Analysis
        </h2>
        <p className="text-gray-400 text-sm">
          Upload a short clip of your batting or bowling. Our AI will perform a detailed pose-based<br />
          analysis and provide actionable feedback in seconds.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-8 mb-6">
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-16 text-center hover:border-emerald-500/50 transition-all cursor-pointer">
          <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Drag & drop or click to upload video</p>
          <p className="text-gray-500 text-sm">Supports MP4, MOV, AVI up to 100MB</p>
        </div>
      </div>

      {/* Analyse Button */}
      <Button variant="secondary" className="w-full py-4 text-base bg-gray-700 hover:bg-gray-600">
        Analyse my technique
      </Button>
    </div>
  );
}
