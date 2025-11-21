export default function Experience() {
  return (
    <section className="py-20 px-6 bg-[#0a1628]">
      <div className="container mx-auto text-center max-w-4xl">
        <h2 className="text-4xl font-bold text-white mb-4">
          Experience Googli.ai
        </h2>
        <p className="text-gray-400 mb-12">
          AI-assisted web powered by powerful designed for graphic compute and NLP.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1a2942] border border-gray-700 rounded-2xl p-6 min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-emerald-400 text-sm font-medium">Live Commentary</span>
            </div>
            <h3 className="text-white font-semibold mb-4">Howzat.</h3>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 bg-emerald-500/20 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          </div>

          <div className="bg-[#1a2942] border border-gray-700 rounded-2xl p-6 min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white text-sm font-medium">Video Analysis</span>
            </div>
            <div className="relative aspect-square bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-emerald-400 rounded-full" />
            </div>
            <div className="text-left space-y-3">
              <div className="text-gray-400 text-sm">Fine Length</div>
              <div className="text-gray-400 text-sm">Ball Suggestion</div>
            </div>
          </div>

          <div className="bg-[#1a2942] border border-gray-700 rounded-2xl p-6 min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white text-sm font-medium">Predictions</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Four</span>
                <span className="text-white">62%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Six</span>
                <span className="text-white">38%</span>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-700">
                <div className="text-gray-400 mb-2">Wicket Probability</div>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray="314" strokeDashoffset="220" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">30%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
