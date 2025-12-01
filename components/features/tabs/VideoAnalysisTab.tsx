'use client';

import { Button } from "@/components/ui/Button";
import { Upload, Play, Pause, RefreshCw } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  parseKeypoints,
  scaleKeypoints,
  SKELETON_CONNECTIONS,
  getKeypointColor,
  type PoseFrame
} from "@/utils/poseUtils";

export default function VideoAnalysisTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [keypointsData, setKeypointsData] = useState<PoseFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const VIDEO_FPS = 30;

  // Load keypoints JSON
  useEffect(() => {
    fetch('/JOE ROOT BATTING MASTERCLASS_keypoints 2.json')
      .then(res => res.json())
      .then(data => {
        setKeypointsData(data);
        console.log('Keypoints loaded:', data.length, 'frames');
      })
      .catch(err => console.error('Error loading keypoints:', err));
  }, []);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  // The Drawing Loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && keypointsData.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 1. Match Canvas Size to Displayed Video Size
        // We check this every frame to handle responsive resizing automatically
        if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
          canvas.width = video.clientWidth;
          canvas.height = video.clientHeight;
        }

        // 2. Clear Previous Frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 3. Calculate Frame Number
        const frameIndex = Math.floor(video.currentTime * VIDEO_FPS);
        setCurrentFrame(frameIndex);

        // 4. Get Data & Draw
        const frameData = keypointsData[frameIndex];

        if (frameData) {
          const rawKeypoints = parseKeypoints(frameData);

          // This scaling function ensures points align even if video is resized via CSS
          const scaledKeypoints = scaleKeypoints(
            rawKeypoints,
            video.videoWidth,  // Original Video Width (e.g. 1920)
            video.videoHeight, // Original Video Height (e.g. 1080)
            canvas.width,      // Current Display Width (e.g. 400)
            canvas.height      // Current Display Height (e.g. 800)
          );

          // Draw Connections (Lines)
          SKELETON_CONNECTIONS.forEach(conn => {
            const p1 = scaledKeypoints[conn.start];
            const p2 = scaledKeypoints[conn.end];
            if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = conn.color;
              ctx.lineWidth = 3;
              ctx.stroke();
            }
          });

          // Draw Joints (Dots)
          scaledKeypoints.forEach((kp, idx) => {
            if (kp.score > 0.3) {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = getKeypointColor(idx);
              ctx.fill();
              // Optional: Add white border to dots for visibility
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [keypointsData]);

  useEffect(() => {
    if (videoUrl) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoUrl, renderLoop]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-bold text-emerald-400">
          Technique Analysis
        </h2>
        <p className="text-slate-400">
          AI-powered skeleton tracking for shot improvement
        </p>
      </div>

      {/* Video Container */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">

        {!videoUrl ? (
          // Upload State
          <div
            onClick={() => fileInputRef.current?.click()}
            className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 m-4 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50 transition-all group"
          >
            <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-medium">Upload Cricket Video</p>
            <p className="text-slate-500 text-sm mt-1">MP4, MOV or AVI (Max 50MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </div>
        ) : (
          // Player State
          <div className="relative flex flex-col items-center bg-black">
            {/* KEY FIX IS HERE: 
               1. 'max-h-[65vh]' limits height to 65% of viewport.
               2. 'w-auto' lets width shrink to maintain aspect ratio.
               3. Wrapper div centers it.
            */}
            <div className="relative inline-block">
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-h-[65vh] w-auto block mx-auto"
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </div>

            {/* Controls Bar */}
            <div className="w-full bg-slate-900/90 backdrop-blur border-t border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <div className="flex flex-col">
                  <span className="text-slate-200 text-sm font-medium">
                    Skeleton Overlay
                  </span>
                  <span className="text-slate-500 text-xs font-mono">
                    Frame: {currentFrame}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setVideoUrl(""); setVideoFile(null); }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <RefreshCw size={14} />
                <span>New Video</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}