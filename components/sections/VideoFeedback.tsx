import { Button } from "@/components/ui/Button";
import { Upload, CheckCircle2 } from "lucide-react";

export default function VideoFeedback() {
  const feedbackItems = [
    { 
      title: "Front-foot alignment", 
      description: "94% confident: Slight forward lean detected", 
      progress: 94 
    },
    { 
      title: "Bat angle tracking", 
      description: "88% confident: Optimal angle maintained", 
      progress: 88 
    },
    { 
      title: "Follow-through motion", 
      description: "91% confident: Good shoulder rotation", 
      progress: 91 
    },
  ];

  return (
    <section className="py-24 px-6 bg-gray-800">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Real-Time Video Feedback
          </h2>
          <p className="text-gray-400 text-sm">
            Upload your video and receive instant AI-powered feedback to improve your cricket skills.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Upload Section */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-10 hover:border-emerald-500/30 transition-all">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Upload className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-white text-2xl font-bold mb-3">Upload Video</h3>
              <p className="text-gray-400 text-sm mb-6">
                Drag and drop or click to upload your cricket training video.
              </p>
            </div>
            
            <Button variant="primary" className="w-full py-3 text-base">
              Choose File
            </Button>
            
            <p className="text-gray-500 text-xs text-center mt-4">
              Supports MP4, MOV, AVI up to 100MB
            </p>
          </div>

          {/* AI Feedback Preview */}
          <div>
            <h3 className="text-white font-semibold text-2xl mb-6">
              AI Feedback Preview
            </h3>
            <div className="space-y-4">
              {feedbackItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-700/50 border border-gray-800 rounded-lg p-5 hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-base mb-1">
                        {item.title}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
