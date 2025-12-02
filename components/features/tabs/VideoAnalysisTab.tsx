'use client';

import { Button } from "@/components/ui/Button";
import { Upload, Play, Pause, RefreshCw, Loader2, Download, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  parseKeypoints,
  scaleKeypoints,
  SKELETON_CONNECTIONS,
  getKeypointColor,
  type PoseFrame
} from "@/utils/poseUtils";
// COMMENTED OUT: Binary conversion libraries (not needed for JSON-only API)
// @ts-ignore - msgpack-lite types
// import msgpack from "msgpack-lite";
// @ts-ignore - pako types
// import pako from "pako";

const API_BASE_URL = process.env.NEXT_PUBLIC_BE_URL || "http://localhost:8000/api";

export default function VideoAnalysisTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyticsPollingRef = useRef<NodeJS.Timeout | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [keypointsData, setKeypointsData] = useState<PoseFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingAnalysis, setIsFetchingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualVideoId, setManualVideoId] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [calculatedFPS, setCalculatedFPS] = useState<number>(30);
  const [bedrockAnalytics, setBedrockAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [expandedDrill, setExpandedDrill] = useState<number | null>(null);

  const POLLING_INTERVAL = 20000; // 20 seconds
  const POLLING_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const ANALYTICS_POLLING_INTERVAL = 10000; // 10 seconds for analytics

  // COMMENTED OUT: Binary conversion logic (msgpack + gzip)
  // Now accepting JSON only from the API
  /*
  const convertBinaryToJson = async (arrayBuffer: ArrayBuffer): Promise<any> => {
    try {
      const uint8Array = new Uint8Array(arrayBuffer);

      // Try to decompress with gzip first
      let dataToUnpack = uint8Array;
      try {
        dataToUnpack = pako.ungzip(uint8Array);
        console.log('Data was gzipped, decompressed successfully');
      } catch (gzipErr) {
        console.log('Data is not gzipped or already decompressed, using raw data');
        // If ungzip fails, the data might not be gzipped, use original
        dataToUnpack = uint8Array;
      }

      // Decode msgpack - convert Uint8Array to Buffer for msgpack-lite
      const decoded = msgpack.decode(Buffer.from(dataToUnpack));
      console.log('Msgpack decoded successfully');
      return decoded;
    } catch (err) {
      console.error('Error converting binary to JSON:', err);

      // Try parsing as plain JSON as fallback
      try {
        const text = new TextDecoder().decode(new Uint8Array(arrayBuffer));
        const jsonData = JSON.parse(text);
        console.log('Parsed as plain JSON successfully');
        return jsonData;
      } catch (jsonErr) {
        console.error('Also failed to parse as JSON:', jsonErr);
        throw new Error('Failed to decode analysis data - not valid msgpack, gzip, or JSON format');
      }
    }
  };
  */

  // Fetch analysis data from API (JSON format only)
  const fetchAnalysisData = async (videoId: string): Promise<PoseFrame[] | null> => {
    try {
      const url = `${API_BASE_URL}videos/${videoId}/analysis?format=json`;
      console.log('Fetching analysis from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 400) {
          console.log('Analysis not ready yet, will retry...');
          return null;
        }
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch analysis: ${response.status} - ${errorText}`);
      }

      console.log('Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // Parse JSON directly from response
      const jsonData = await response.json();

      console.log('Analysis data loaded:', jsonData.length, 'frames');
      return jsonData;
    } catch (err: any) {
      console.error('Error fetching analysis data:', err);
      throw err;
    }
  };

  // Fetch bedrock analytics data from API
  const fetchBedrockAnalytics = async (videoId: string): Promise<any | null> => {
    try {
      const url = `${API_BASE_URL}videos/${videoId}/bedrock-analytics`;
      console.log('Fetching bedrock analytics from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          console.log('Bedrock analytics not ready yet, will retry...');
          return null;
        }
        const errorText = await response.text();
        console.error('Bedrock Analytics API Error:', errorText);
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      // Get the response as JSON first
      const responseData = await response.json();
      console.log('Raw bedrock analytics response:', responseData);

      // Extract the stringified JSON from content[0].text
      let analyticsData;
      if (responseData.content && responseData.content[0] && responseData.content[0].text) {
        // Parse the stringified JSON from content[0].text
        const textData = responseData.content[0].text;
        analyticsData = JSON.parse(textData);
      } else {
        // Fallback: try parsing the response directly
        analyticsData = responseData;
      }

      console.log('Parsed bedrock analytics:', analyticsData);
      return analyticsData;
    } catch (err: any) {
      console.error('Error fetching bedrock analytics:', err);
      return null;
    }
  };

  // Stop analytics polling helper
  const stopAnalyticsPolling = useCallback(() => {
    if (analyticsPollingRef.current) {
      clearInterval(analyticsPollingRef.current);
      analyticsPollingRef.current = null;
    }
  }, []);

  // Start polling for analytics after skeleton data is loaded
  const startAnalyticsPolling = useCallback((videoId: string) => {
    console.log('Starting analytics polling for video:', videoId);
    setIsLoadingAnalytics(true);

    const pollAnalytics = async () => {
      const data = await fetchBedrockAnalytics(videoId);

      if (data) {
        // Analytics received!
        setBedrockAnalytics(data);
        setIsLoadingAnalytics(false);
        stopAnalyticsPolling();
        console.log('Analytics polling complete');
      }
    };

    // Initial poll
    pollAnalytics();

    // Set up interval for every 10 seconds
    analyticsPollingRef.current = setInterval(pollAnalytics, ANALYTICS_POLLING_INTERVAL);
  }, [stopAnalyticsPolling]);

  // Calculate FPS based on video duration and frame count
  const calculateFPS = useCallback((duration: number, frameCount: number) => {
    if (duration > 0 && frameCount > 0) {
      const fps = frameCount / duration;
      console.log(`Calculated FPS: ${fps.toFixed(2)} (${frameCount} frames / ${duration.toFixed(2)}s)`);
      setCalculatedFPS(fps);
      return fps;
    }
    return 30; // Default fallback
  }, []);

  // Handle video metadata loaded
  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration) {
      const duration = video.duration;
      setVideoDuration(duration);
      console.log(`Video duration: ${duration.toFixed(2)}s`);

      // If we already have keypoints data, calculate FPS
      if (keypointsData.length > 0) {
        calculateFPS(duration, keypointsData.length);
      }
    }
  }, [keypointsData.length, calculateFPS]);

  // Recalculate FPS when keypoints data changes
  useEffect(() => {
    if (videoDuration > 0 && keypointsData.length > 0) {
      calculateFPS(videoDuration, keypointsData.length);
    }
  }, [videoDuration, keypointsData.length, calculateFPS]);

  // Manual fetch analysis data
  const handleManualFetchAnalysis = async () => {
    if (!manualVideoId.trim()) {
      setError('Please enter a video ID');
      return;
    }

    setIsFetchingAnalysis(true);
    setError(null);
    setUploadStatus('Fetching analysis data...');

    try {
      const data = await fetchAnalysisData(manualVideoId.trim());

      if (data) {
        setKeypointsData(data);
        setUploadStatus('Analysis data loaded successfully!');
        console.log('Loaded', data.length, 'frames of keypoints data');

        // Calculate FPS if video is already loaded
        if (videoDuration > 0) {
          calculateFPS(videoDuration, data.length);
        }
      } else {
        setError('Analysis not ready yet. Please try again later.');
        setUploadStatus('');
      }
    } catch (err: any) {
      console.error('Manual fetch error:', err);
      setError(err.message || 'Failed to fetch analysis data');
      setUploadStatus('');
    } finally {
      setIsFetchingAnalysis(false);
    }
  };

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  // Poll for analysis completion
  const startPolling = useCallback((videoId: string) => {
    console.log('Starting polling for video:', videoId);
    setIsProcessing(true);
    setUploadStatus('Processing video...');

    const poll = async () => {
      try {
        const data = await fetchAnalysisData(videoId);

        if (data) {
          // Analysis complete!
          setKeypointsData(data);
          setIsProcessing(false);
          setUploadStatus('Analysis complete!');
          stopPolling();

          // Start analytics polling after skeleton data is loaded
          if (videoId) {
            startAnalyticsPolling(videoId);
          }
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message);
        setIsProcessing(false);
        stopPolling();
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);

    // Set up 30-minute timeout
    pollingTimeoutRef.current = setTimeout(() => {
      console.log('Polling timeout reached (30 minutes)');
      stopPolling();
      setIsProcessing(false);
      setError('Processing timeout: Video analysis took longer than 30 minutes. Please try again or contact support.');
      setUploadStatus('Processing timeout');
    }, POLLING_TIMEOUT);
  }, [stopPolling]);

  // Upload video to API
  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadStatus('Uploading video...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}videos/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload response:', result);

      setUploadedVideoId(result.video_id);
      setUploadStatus('Upload complete! Processing...');

      // Start polling for analysis
      startPolling(result.video_id);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
      setUploadStatus('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      // Upload to API
      uploadVideo(file);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopAnalyticsPolling();
    };
  }, [stopPolling], stopAnalyticsPolling);

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

        // 3. Calculate Frame Number using calculated FPS
        const frameIndex = Math.floor(video.currentTime * calculatedFPS);
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
  }, [keypointsData, calculatedFPS]);

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

      {/* Status Messages */}
      {(isUploading || isProcessing || isFetchingAnalysis) && (
        <div className="mb-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <div>
            <p className="text-blue-200 font-medium">{uploadStatus}</p>
            {isProcessing && (
              <p className="text-blue-400 text-sm mt-1">
                Checking every 20 seconds for completion...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadStatus && !isUploading && !isProcessing && !isFetchingAnalysis && !error && (
        <div className="mb-4 bg-emerald-900/30 border border-emerald-700 rounded-lg p-4">
          <p className="text-emerald-200 font-medium">✓ {uploadStatus}</p>
          {keypointsData.length > 0 && (
            <p className="text-emerald-400 text-sm mt-1">
              Loaded {keypointsData.length} frames of skeleton data
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-200 font-medium">Error</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Manual Fetch Analysis Section */}
      {/* <div className="w-full mb-4 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Fetch Analysis by Video ID
            </label>
            <input
              type="text"
              value={manualVideoId}
              onChange={(e) => setManualVideoId(e.target.value)}
              placeholder="Enter video ID (e.g., 743a14d1-d786-43ea-aa65-01780bb681f0)"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              disabled={isFetchingAnalysis}
            />
          </div>
          <button
            onClick={handleManualFetchAnalysis}
            disabled={isFetchingAnalysis || !manualVideoId.trim()}
            className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isFetchingAnalysis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Fetch Analysis</span>
              </>
            )}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-2">
          Enter a video ID to manually fetch and display its skeleton analysis data
        </p>
      </div> */}

      {/* Video Container */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">

        {!videoUrl ? (
          // Upload State
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 m-4 rounded-xl ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50'
              } transition-all group`}
          >
            <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-emerald-400" />
              )}
            </div>
            <p className="text-white font-medium">
              {isUploading ? 'Uploading...' : 'Upload Cricket Video'}
            </p>
            <p className="text-slate-500 text-sm mt-1">MP4, MOV or AVI (Max 50MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              disabled={isUploading}
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
                onLoadedMetadata={handleVideoMetadata}
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
                    Frame: {currentFrame} / {keypointsData.length} ({calculatedFPS.toFixed(1)} FPS)
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setVideoUrl("");
                  setVideoFile(null);
                  setUploadedVideoId(null);
                  setKeypointsData([]);
                  setUploadStatus("");
                  setError(null);
                  stopPolling();
                  setBedrockAnalytics(null);
                  setIsLoadingAnalytics(false);
                  stopAnalyticsPolling();
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <RefreshCw size={14} />
                <span>New Video</span>
              </button>
            </div>
          </div>
        )}
        {/* Bedrock Analytics Display */}
        {bedrockAnalytics && (
          <div className="w-full mt-8 space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div className="text-center flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Analysis Results
                </h2>
                <p className="text-slate-400">AI-powered insights to improve your technique</p>
              </div>
              <button
                onClick={async () => {
                  if (uploadedVideoId) {
                    setIsLoadingAnalytics(true);
                    const data = await fetchBedrockAnalytics(uploadedVideoId);
                    if (data) {
                      setBedrockAnalytics(data);
                    }
                    setIsLoadingAnalytics(false);
                  }
                }}
                disabled={isLoadingAnalytics}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Summary Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-emerald-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-emerald-400 mb-2">
                    {bedrockAnalytics.summary?.headline}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-medium">
                      {bedrockAnalytics.summary?.skill_level}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {bedrockAnalytics.summary?.overall_score}
                    </div>
                    <div className="text-xs text-emerald-100">/ 10</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Observations */}
            {bedrockAnalytics.key_observations && bedrockAnalytics.key_observations.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-4">Key Observations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bedrockAnalytics.key_observations.map((obs: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xl font-bold text-emerald-400">
                              {obs.score}
                            </div>
                            <div className="text-xs text-emerald-300">/10</div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                            {obs.title}
                          </h4>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {obs.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Areas */}
            {bedrockAnalytics.improvement_areas && bedrockAnalytics.improvement_areas.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-4">Improvement Areas</h3>
                <div className="space-y-3">
                  {bedrockAnalytics.improvement_areas.map((area: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:border-yellow-500/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-semibold text-white">
                              {area.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${area.priority === 'high'
                                ? 'bg-red-500/20 text-red-300'
                                : area.priority === 'medium'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-blue-500/20 text-blue-300'
                                }`}
                            >
                              {area.priority}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm">{area.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Drills */}
            {bedrockAnalytics.suggested_drills && bedrockAnalytics.suggested_drills.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-4">Suggested Drills</h3>
                <div className="space-y-3">
                  {bedrockAnalytics.suggested_drills.map((drill: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-emerald-500/30 transition-all"
                    >
                      <button
                        onClick={() => setExpandedDrill(expandedDrill === idx ? null : idx)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-1">
                            {drill.name}
                          </h4>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                            {drill.focus_area}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div
                            className={`transform transition-transform ${expandedDrill === idx ? 'rotate-180' : ''}`}
                          >
                            <svg
                              className="w-5 h-5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </button>
                      {expandedDrill === idx && (
                        <div className="px-4 pb-4 border-t border-slate-700">
                          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                            {drill.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            {bedrockAnalytics.explanation && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <h3 className="text-2xl font-bold text-emerald-400 mb-4">Explanation</h3>
                <div className="space-y-4">
                  <p className="text-slate-300 leading-relaxed">
                    {bedrockAnalytics.explanation.long_form}
                  </p>
                  {bedrockAnalytics.explanation.notes && bedrockAnalytics.explanation.notes.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        Key Focus Points
                      </h4>
                      <ul className="space-y-2">
                        {bedrockAnalytics.explanation.notes.map((note: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-400 text-sm">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Loading State */}
        {isLoadingAnalytics && !bedrockAnalytics && (
          <div className="w-full mt-8 bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Loading AI Analytics...</p>
            <p className="text-slate-400 text-sm mt-2">Analyzing your technique, please wait...</p>
          </div>
        )}

      </div>
    </div>
  );
}
