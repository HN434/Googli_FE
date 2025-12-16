"use client";

import { useState } from "react";
import { Video, Mic, TrendingUp, BarChart3, MessageSquareText, Box } from "lucide-react";
import VideoAnalysisTab from "./tabs/VideoAnalysisTab";
import CommentaryTab from "./tabs/CommentaryTab";
import PredictionsTab from "./tabs/PredictionsTab";
import MultiModelChat from "./tabs/MultiModelChat";
import ThreeDVideo from "./tabs/3DVideo";

type TabType = "video" | "commentary" | "3d-replay-video" | "multimodel-chat" | "3d-video";

export default function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("commentary");

  const tabs = [
    { id: "commentary" as TabType, label: "Live Commentary", icon: Mic },
    // { id: "multimodel-chat" as TabType, label: "Multimodel Chat", icon: MessageSquareText },
    { id: "video" as TabType, label: "Video Analysis & 3D Replay", icon: Video },
    // { id: "3d-replay-video" as TabType, label: "3D Replay Video", icon: Box },
    // { id: "3d-video" as TabType, label: "3D Video", icon: Box },
  ];

  return (
    <section className="py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 bg-gray-900 min-h-screen">
      <div className="container mx-auto max-w-5xl">
        {/* Tabs Navigation */}
        <div className="grid grid-cols-2 sm:flex sm:justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 md:mb-12 sm:overflow-x-auto sm:pb-2 sm:scrollbar-thin sm:scrollbar-thumb-gray-700 sm:scrollbar-track-transparent">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 rounded-lg sm:rounded-xl font-medium transition-all sm:min-w-[140px] md:min-w-[160px] sm:flex-shrink-0 ${activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                  : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
                  }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {activeTab === "video" && <VideoAnalysisTab />}
          {activeTab === "commentary" && <CommentaryTab />}
          {/* {activeTab === "3d-replay-video" && <PredictionsTab />} */}
          {activeTab === "multimodel-chat" && <MultiModelChat />}
          {/* {activeTab === "3d-video" && <ThreeDVideo />} */}
        </div>
      </div>
    </section>
  );
}
