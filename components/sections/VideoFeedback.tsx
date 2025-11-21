import { Button } from "@/components/ui/Button";

export default function VideoFeedback() {
  const feedbackItems = [
    { title: "Head Shot Analysis", description: "Improve your batting stance and head position", progress: 85 },
    { title: "Get angle & strike", description: "Optimize your shot angle and timing", progress: 70 },
    { title: "Follow Through Analysis", description: "Enhance your follow-through technique", progress: 92 },
  ];

  return (
    <section className="py-20 px-6 bg-[#0a1628]">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Real-Time Video Feedback
          </h2>
          <p className="text-gray-400">
            Upload your video and receive instant AI-powered feedback to improve your cricket skills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="bg-[#1a2942] border border-gray-700 rounded-2xl p-8">
            <div className="aspect-video bg-gray-800 rounded-lg mb-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">⬆</span>
                </div>
                <p className="text-gray-400">Upload Video</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">
              Drag and drop your video here or click to browse
            </p>
            <Button variant="primary" className="w-full mt-4">
              Choose File
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold text-xl mb-6">
              AI Feedback Preview
            </h3>
            {feedbackItems.map((item, index) => (
              <div
                key={index}
                className="bg-[#1a2942] border border-gray-700 rounded-xl p-4 hover:border-emerald-500 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2" />
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
