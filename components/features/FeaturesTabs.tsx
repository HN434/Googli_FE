"use client";

import { useState } from "react";
import { Video, Mic, TrendingUp, BarChart3, MessageSquareText, Box } from "lucide-react";
import VideoAnalysisTab from "./tabs/VideoAnalysisTab";
import CommentaryTab from "./tabs/CommentaryTab";
import PredictionsTab from "./tabs/PredictionsTab";
import MultiModelChat from "./tabs/MultiModelChat";

type TabType = "video" | "commentary" | "3d-replay-video" | "multimodel-chat";

export default function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("commentary");

  const tabs = [
    { id: "commentary" as TabType, label: "Commentary", icon: Mic },
    { id: "multimodel-chat" as TabType, label: "Multimodel Chat", icon: MessageSquareText },
    { id: "video" as TabType, label: "Video Analysis", icon: Video },
    { id: "3d-replay-video" as TabType, label: "3D Replay Video", icon: Box },
  ];

  return (
    <section className="py-8 px-6 bg-gray-900 min-h-screen">
      <div className="container mx-auto max-w-5xl">
        {/* Tabs Navigation */}
        <div className="flex justify-center gap-3 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all min-w-[120px] ${activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                  : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "video" && <VideoAnalysisTab />}
          {activeTab === "commentary" && <CommentaryTab />}
          {activeTab === "3d-replay-video" && <PredictionsTab />}
          {activeTab === "multimodel-chat" && <MultiModelChat />}
        </div>
      </div>
    </section>
  );
}
