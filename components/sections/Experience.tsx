import { Mic, Video, TrendingUp } from "lucide-react";

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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Live Commentary Card */}
          <div className="bg-[#0a1628] border border-gray-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-2 mb-6">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">Live Commentary</span>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  HB
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Harsha B.</div>
                  <div className="text-gray-500 text-xs">Expert - Cricket</div>
                </div>
              </div>
              
              {/* Audio Waveform Visualization */}
              <div className="flex items-end gap-1 h-20 mb-4">
                {[4, 8, 6, 12, 10, 14, 16, 12, 18, 14, 10, 16, 12, 8, 14, 10, 6, 12, 8, 10, 14, 12, 16, 10, 8, 12, 14, 10, 6, 8].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500 rounded-sm transition-all"
                    style={{ height: `${height * 4}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-400">
              <p className="leading-relaxed">"What a delivery! A perfect yorker, right in the blockhole!"</p>
              <p className="leading-relaxed">"The batter had no answer..."</p>
              <p className="leading-relaxed">"That's a huge wicket at this stage of the game! The crowd is going wild!"</p>
              <p className="leading-relaxed">"Incredible scenes!"</p>
            </div>
          </div>

          {/* Video Analysis Card */}
          <div className="bg-[#0a1628] border border-gray-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">Video Analysis</span>
            </div>
            
            {/* Ball Trajectory Visualization */}
            <div className="relative bg-[#0f1f3a] rounded-lg p-6 mb-6 h-48 flex items-center justify-center">
              <svg viewBox="0 0 200 150" className="w-full h-full">
                {/* Trajectory Arc */}
                <path
                  d="M 30 120 Q 100 30, 170 100"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                />
                {/* Ball positions */}
                <circle cx="30" cy="120" r="4" fill="#10b981" />
                <circle cx="70" cy="65" r="3" fill="#10b981" opacity="0.7" />
                <circle cx="100" cy="40" r="3" fill="#10b981" opacity="0.5" />
                <circle cx="130" cy="55" r="3" fill="#10b981" opacity="0.7" />
                <circle cx="170" cy="100" r="4" fill="#10b981" />
                {/* Labels */}
                <text x="100" y="145" fill="#6b7280" fontSize="10" textAnchor="middle">
                  Frame 5/10 (0.4s)
                </text>
              </svg>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <h4 className="text-white text-sm font-semibold mb-2">Key Insights</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Head position is stable through impact.</p>
                      <p className="text-xs text-emerald-400">CONF: 94%</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Front foot opens up slightly early.</p>
                      <p className="text-xs text-yellow-400">CONF: 83%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-left pt-4 border-t border-gray-800">
                <h4 className="text-white text-sm font-semibold mb-2">Drill Suggestion</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Practice the "gate drill" with two cones to keep your front foot aligned towards the bowler during your stride.
                </p>
              </div>
            </div>
          </div>

          {/* Predictions Card */}
          <div className="bg-[#0a1628] border border-gray-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">Predictions</span>
            </div>
            
            <div className="space-y-6">
              {/* Match Predictions */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">IND</div>
                    <div className="text-gray-500 text-xs">Win Prob.</div>
                  </div>
                  <div className="text-white text-2xl font-bold">62%</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">AUS</div>
                    <div className="text-gray-500 text-xs">Win Prob.</div>
                  </div>
                  <div className="text-white text-2xl font-bold">38%</div>
                </div>
              </div>

              {/* Momentum Chart */}
              <div className="pt-6 border-t border-gray-800">
                <div className="text-gray-400 text-xs mb-3">Momentum</div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-gray-500">IND</span>
                  <div className="flex-1 flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-full ${
                          i < 6 ? 'bg-emerald-500' : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">AUS</span>
                </div>
              </div>

              {/* Pressure Index */}
              <div className="pt-6 border-t border-gray-800">
                <div className="text-gray-400 text-xs mb-4 text-center">Pressure Index</div>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="12" 
                      strokeDasharray="314" 
                      strokeDashoffset="78.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">75</span>
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
