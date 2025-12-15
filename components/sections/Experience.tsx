import { Mic, Video, MessageSquare } from "lucide-react";

export default function Experience() {
  return (
    <section className="py-24 px-6 bg-gray-900">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Experience Googli.ai
          </h2>
          <p className="text-gray-400 text-sm">
            An intuitive and powerful interface designed for players, coaches and fans.
          </p>
        </div>

        <div className="mt-20 flex flex-col md:flex-row justify-center items-center md:items-end gap-8 md:gap-0">
          {/* Live Commentary Phone */}
          <div className="w-[280px] h-[580px] transition-transform duration-500 ease-in-out hover:-translate-y-2 md:scale-90">
            <div className="w-full h-full bg-gray-800/80 backdrop-blur-md border-4 border-gray-600 rounded-[40px] mx-auto shadow-2xl p-2.5 flex flex-col transition-all duration-500 hover:border-emerald-500/50">
              <div className="bg-gray-900 rounded-[30px] flex-1 p-4 overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 bg-gray-800 rounded-full flex items-center justify-end px-2">
                  <div className="w-2.5 h-2.5 bg-gray-700 rounded-full"></div>
                </div>

                <div className="mt-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 text-emerald-400 mb-4">
                    <Mic className="h-8 w-8" />
                    <h3 className="font-bold text-lg">Live Commentary</h3>
                  </div>

                  <div className="flex flex-col h-[450px]">
                    {/* Match Score Header */}
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-[10px] text-red-400 font-semibold">LIVE</span>
                        </div>
                        <span className="text-emerald-400 text-[10px] font-semibold">IND opt to bat</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-gray-400 text-xs">IND</span>
                        <span className="text-white text-xl font-bold">125/3</span>
                        <span className="text-gray-500 text-xs">12.4 ov</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px]">
                        <div>
                          <span className="text-gray-500">Striker: </span>
                          <span className="text-white">V. Kohli</span>
                          <span className="text-gray-400"> 61(40)</span>
                        </div>
                      </div>
                      <div className="text-[10px] mt-1">
                        <span className="text-gray-500">Bowler: </span>
                        <span className="text-white">M. Starc</span>
                        <span className="text-gray-400"> 4-0-23-0</span>
                      </div>
                    </div>

                    {/* Commentary Log */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                      <h4 className="text-white text-xs font-semibold mb-2">Commentary Log</h4>

                      {/* Ball 12.4 */}
                      <div className="bg-gray-800/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-emerald-400 text-xs font-mono">12.4</span>
                          <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FOUR</span>
                        </div>
                        <p className="text-gray-300 text-[10px] leading-relaxed">
                          Starc to Kohli, FOUR, what a shot! Short delivery, Kohli rocks back and pulls it magnificently over midwicket!
                        </p>
                      </div>

                      {/* Ball 12.3 */}
                      <div className="bg-gray-800/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-emerald-400 text-xs font-mono">12.3</span>
                        </div>
                        <p className="text-gray-300 text-[10px] leading-relaxed">
                          Starc to Kohli, 2 runs, good length ball, Kohli drives through covers, easy two.
                        </p>
                      </div>

                      {/* Ball 12.2 */}
                      <div className="bg-gray-800/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-emerald-400 text-xs font-mono">12.2</span>
                          <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">SIX</span>
                        </div>
                        <p className="text-gray-300 text-[10px] leading-relaxed">
                          Starc to Kohli, SIX! Absolutely smashed! Full toss and Kohli sends it sailing over long-on!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Analysis Phone (Center, Larger) */}
          <div className="w-[280px] h-[580px] transition-transform duration-500 ease-in-out hover:-translate-y-2 z-10 md:scale-105 md:-mx-8">
            <div className="w-full h-full bg-gray-800/80 backdrop-blur-md border-4 border-gray-600 rounded-[40px] mx-auto shadow-2xl p-2.5 flex flex-col transition-all duration-500 hover:border-emerald-500/50">
              <div className="bg-gray-900 rounded-[30px] flex-1 p-4 overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 bg-gray-800 rounded-full flex items-center justify-end px-2">
                  <div className="w-2.5 h-2.5 bg-gray-700 rounded-full"></div>
                </div>

                <div className="mt-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 text-emerald-400 mb-4">
                    <Video className="h-8 w-8" />
                    <h3 className="font-bold text-lg">Pose Analysis</h3>
                  </div>

                  <div className="flex flex-col h-[450px]">
                    {/* Video Preview with Pose Overlay */}
                    <div className="relative w-full aspect-[16/10] bg-black rounded-lg mb-3 ring-1 ring-inset ring-emerald-500/20 overflow-hidden">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="bone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981"></stop>
                            <stop offset="100%" stopColor="#3b82f6"></stop>
                          </linearGradient>
                        </defs>

                        {/* Cricket Player Skeleton - Full Body */}
                        {/* Head to Neck */}
                        <line x1="0.5" y1="0.15" x2="0.5" y2="0.22" stroke="#00D9FF" strokeWidth="0.008"></line>

                        {/* Neck to Shoulders */}
                        <line x1="0.5" y1="0.22" x2="0.42" y2="0.28" stroke="#FF6B35" strokeWidth="0.008"></line>
                        <line x1="0.5" y1="0.22" x2="0.58" y2="0.28" stroke="#FFD23F" strokeWidth="0.008"></line>

                        {/* Torso - Neck to Hips */}
                        <line x1="0.5" y1="0.22" x2="0.48" y2="0.5" stroke="#00D9FF" strokeWidth="0.008"></line>

                        {/* Left Arm - Shoulder to Elbow to Wrist */}
                        <line x1="0.42" y1="0.28" x2="0.38" y2="0.4" stroke="#FF6B35" strokeWidth="0.008"></line>
                        <line x1="0.38" y1="0.4" x2="0.3" y2="0.48" stroke="#FF6B35" strokeWidth="0.008"></line>

                        {/* Right Arm - Shoulder to Elbow to Wrist (holding bat) */}
                        <line x1="0.58" y1="0.28" x2="0.52" y2="0.42" stroke="#FFD23F" strokeWidth="0.008"></line>
                        <line x1="0.52" y1="0.42" x2="0.48" y2="0.52" stroke="#FFD23F" strokeWidth="0.008"></line>

                        {/* Hips */}
                        <line x1="0.48" y1="0.5" x2="0.44" y2="0.52" stroke="#10B981" strokeWidth="0.008"></line>
                        <line x1="0.48" y1="0.5" x2="0.52" y2="0.52" stroke="#10B981" strokeWidth="0.008"></line>

                        {/* Left Leg - Hip to Knee to Ankle */}
                        <line x1="0.44" y1="0.52" x2="0.42" y2="0.72" stroke="#FF1493" strokeWidth="0.008"></line>
                        <line x1="0.42" y1="0.72" x2="0.4" y2="0.92" stroke="#FF1493" strokeWidth="0.008"></line>

                        {/* Right Leg - Hip to Knee to Ankle */}
                        <line x1="0.52" y1="0.52" x2="0.54" y2="0.72" stroke="#FF1493" strokeWidth="0.008"></line>
                        <line x1="0.54" y1="0.72" x2="0.56" y2="0.92" stroke="#FF1493" strokeWidth="0.008"></line>

                        {/* Joints - Key Points */}
                        {/* Head */}
                        <circle cx="0.5" cy="0.15" r="0.012" fill="white" stroke="#00D9FF" strokeWidth="0.002"></circle>
                        {/* Neck */}
                        <circle cx="0.5" cy="0.22" r="0.008" fill="white"></circle>
                        {/* Shoulders */}
                        <circle cx="0.42" cy="0.28" r="0.008" fill="white" stroke="#FF6B35" strokeWidth="0.002"></circle>
                        <circle cx="0.58" cy="0.28" r="0.008" fill="white" stroke="#FFD23F" strokeWidth="0.002"></circle>
                        {/* Elbows */}
                        <circle cx="0.38" cy="0.4" r="0.007" fill="white"></circle>
                        <circle cx="0.52" cy="0.42" r="0.007" fill="white"></circle>
                        {/* Wrists */}
                        <circle cx="0.3" cy="0.48" r="0.007" fill="white"></circle>
                        <circle cx="0.48" cy="0.52" r="0.007" fill="white"></circle>
                        {/* Hips */}
                        <circle cx="0.44" cy="0.52" r="0.008" fill="white" stroke="#10B981" strokeWidth="0.002"></circle>
                        <circle cx="0.52" cy="0.52" r="0.008" fill="white" stroke="#10B981" strokeWidth="0.002"></circle>
                        {/* Knees */}
                        <circle cx="0.42" cy="0.72" r="0.007" fill="white"></circle>
                        <circle cx="0.54" cy="0.72" r="0.007" fill="white"></circle>
                        {/* Ankles */}
                        <circle cx="0.4" cy="0.92" r="0.007" fill="white"></circle>
                        <circle cx="0.56" cy="0.92" r="0.007" fill="white"></circle>
                      </svg>
                      <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-semibold">Pose Tracking</div>
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded">0:24</div>
                    </div>

                    {/* Analysis Results */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                      <div className="bg-gray-800/50 rounded-lg p-2.5">
                        <div className="flex items-start gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-400 font-bold text-sm">7</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white text-xs font-semibold mb-0.5">Analysis Results</h4>
                            <p className="text-gray-400 text-[9px] leading-tight">Solid base with good balance and smooth motion.</p>
                          </div>
                        </div>
                      </div>

                      {/* Key Observations */}
                      <div>
                        <h4 className="text-white text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                          <span className="text-emerald-400">✓</span> Key Observations
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2 bg-gray-800/30 rounded p-1.5">
                            <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-400 text-[10px] font-bold">1</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-[9px] font-medium mb-0.5">Stance and Balance</p>
                              <p className="text-gray-400 text-[8px] leading-tight">Feet positioned well, weight evenly distributed</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 bg-gray-800/30 rounded p-1.5">
                            <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-400 text-[10px] font-bold">2</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-[9px] font-medium mb-0.5">Backswing and Bat Path</p>
                              <p className="text-gray-400 text-[8px] leading-tight">High backlift, straight bat path, good follow-through</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Improvement Areas */}
                      <div>
                        <h4 className="text-white text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                          <span className="text-yellow-400">⚠</span> Improvement Areas
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2 bg-yellow-500/10 rounded p-1.5 border border-yellow-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92z" clipRule="evenodd"></path>
                            </svg>
                            <div className="flex-1">
                              <p className="text-yellow-300 text-[9px] font-medium mb-0.5">Footwork Timing</p>
                              <p className="text-gray-400 text-[8px] leading-tight">Front foot opens up slightly early during delivery stride</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Assistant Phone */}
          <div className="w-[280px] h-[580px] transition-transform duration-500 ease-in-out hover:-translate-y-2 md:scale-90">
            <div className="w-full h-full bg-gray-800/80 backdrop-blur-md border-4 border-gray-600 rounded-[40px] mx-auto shadow-2xl p-2.5 flex flex-col transition-all duration-500 hover:border-emerald-500/50">
              <div className="bg-gray-900 rounded-[30px] flex-1 p-4 overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 bg-gray-800 rounded-full flex items-center justify-end px-2">
                  <div className="w-2.5 h-2.5 bg-gray-700 rounded-full"></div>
                </div>

                <div className="mt-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 text-emerald-400 mb-4">
                    <MessageSquare className="h-8 w-8" />
                    <h3 className="font-bold text-lg">AI Assistant</h3>
                  </div>

                  <div className="flex flex-col h-[450px] justify-between">
                    {/* Chat Messages */}
                    <div className="space-y-3">
                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
                          <p className="text-xs text-emerald-200">How can I improve my cover drive?</p>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="bg-slate-800 border border-gray-700 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">AI</span>
                            </div>
                            <span className="text-[10px] text-gray-500">Cricket Expert</span>
                          </div>
                          <p className="text-xs text-gray-300">Focus on these key points:</p>
                          <ul className="text-xs text-gray-400 space-y-1 mt-2 ml-2">
                            <li className="flex items-start gap-1">
                              <span className="text-emerald-400">•</span>
                              <span>Keep head still through shot</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-emerald-400">•</span>
                              <span>Transfer weight onto front foot</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-emerald-400">•</span>
                              <span>High elbow at contact</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* User Follow-up */}
                      <div className="flex justify-end">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg rounded-tr-none px-3 py-2 max-w-[75%]">
                          <p className="text-xs text-emerald-200">Show me a drill</p>
                        </div>
                      </div>

                      {/* AI Drill Response */}
                      <div className="flex justify-start">
                        <div className="bg-slate-800 border border-gray-700 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                          <p className="text-xs text-gray-300">Try "One-Knee Drive Drill" - practice from kneeling position to focus on upper body mechanics.</p>
                        </div>
                      </div>
                    </div>

                    {/* Feature Highlights */}
                    {/* <div className="pt-4 border-t border-gray-800 space-y-2 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <p className="text-xs text-gray-400">Multimodal input support</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <p className="text-xs text-gray-400">Real-time expertise</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <p className="text-xs text-gray-400">Personalized advice</p>
                      </div>
                    </div> */}
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
