'use client';

import { useState } from 'react';
import FloatingChat from '@/components/features/FloatingChat';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 bg-gray-800/90 backdrop-blur-md border border-emerald-500/30 text-white rounded-full p-3.5 shadow-lg hover:bg-gray-700/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all hover:scale-110 hover:shadow-emerald-500/20 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
        aria-label="Open Chat Assistant"
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none">
          <defs>
            <linearGradient id="googli-gradient" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0%" stopColor="#10b981"></stop>
              <stop offset="100%" stopColor="#3b82f6"></stop>
            </linearGradient>
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"></feGaussianBlur>
              <feMerge>
                <feMergeNode in="coloredBlur"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45" stroke="url(#googli-gradient)" strokeWidth="3" opacity="0.4" filter="url(#glow-filter)"></circle>
          <circle cx="50" cy="50" r="45" stroke="url(#googli-gradient)" strokeWidth="3"></circle>
          <path d="M 30 25 C 40 40, 40 60, 30 75
             M 70 25 C 60 40, 60 60, 70 75
             M 50 10 V 20 M 50 80 V 90
             M 40 15 L 45 20 M 60 15 L 55 20
             M 40 85 L 45 80 M 60 85 L 55 80" stroke="url(#googli-gradient)" strokeWidth="2.5" strokeLinecap="round"></path>
        </svg>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-in-out ${isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
          } ${isFullscreen
            ? 'inset-4'
            : 'bottom-6 right-6'
          }`}
        style={
          isFullscreen
            ? {}
            : {
              width: '480px',
              height: '650px',
              maxWidth: 'calc(100vw - 48px)',
              maxHeight: 'calc(100vh - 48px)',
            }
        }
      >
        <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Chat Component */}
          <FloatingChat
            onClose={() => setIsOpen(false)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      </div>
    </>
  );
}
