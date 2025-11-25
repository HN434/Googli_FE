"use client";

import { useState } from "react";
import { Video, Mic, TrendingUp, BarChart3 } from "lucide-react";
import VideoAnalysisTab from "./tabs/VideoAnalysisTab";
import CommentaryTab from "./tabs/CommentaryTab";
import PredictionsTab from "./tabs/PredictionsTab";

type TabType = "video" | "commentary" | "predictions" | "simulation";

export default function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("video");

  const tabs = [
    { id: "video" as TabType, label: "Video Analysis", icon: Video },
    { id: "commentary" as TabType, label: "Commentary", icon: Mic },
    { id: "predictions" as TabType, label: "Predictions", icon: TrendingUp },
    { id: "simulation" as TabType, label: "XR Simulation", icon: BarChart3 },
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
                className={`flex flex-col items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all min-w-[120px] ${
                  activeTab === tab.id
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
          {activeTab === "predictions" && <PredictionsTab />}
          {activeTab === "simulation" && <VideoAnalysisTab />}
        </div>
      </div>
    </section>
  );
}
