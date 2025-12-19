'use client';

import { Button } from "@/components/ui/Button";
import { Upload, Play, Pause, RefreshCw, Loader2, Download, AlertTriangle, TrendingUp, CheckCircle, Volume2, VolumeX } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  parseKeypoints,
  parseAllPersonsKeypoints,
  scaleKeypoints,
  SKELETON_CONNECTIONS,
  getKeypointColor,
  type PoseFrame
} from "@/utils/poseUtils";
import { scaleBatDetections, drawBatDetection } from "@/utils/batUtils";
import { useVideoWebSocket } from "@/hooks/useVideoWebSocket";
import ThreeDSkeletonView from "./ThreeDSkeletonView";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BE_URL || "http://localhost:8000/api").replace(/\/$/, "");

const buildApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const formatSeconds = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const getSkillLevel = (overallScore?: number): string => {
  if (overallScore === undefined || Number.isNaN(overallScore)) {
    return "Unknown";
  }
  if (overallScore >= 0 && overallScore <= 3) {
    return "Beginner";
  }
  if (overallScore >= 4 && overallScore <= 6) {
    return "Intermediate";
  }
  if (overallScore >= 7 && overallScore <= 10) {
    return "Professional";
  }
  return "Unknown";
};

const normalizeAnalyticsPayload = (payload: any) => {
  if (!payload) return null;

  // If this already looks like a structured analytics object, just return it
  if (typeof payload === "object" && payload !== null) {
    if (payload.summary || payload.key_observations || payload.improvement_areas || payload.explanation) {
      return payload;
    }
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  // Common Bedrock streaming wrappers
  if (payload.content && Array.isArray(payload.content) && payload.content[0]?.text) {
    try {
      return JSON.parse(payload.content[0].text);
    } catch {
      return payload.content[0].text;
    }
  }
  if (payload.data) {
    const inner = payload.data;
    // If Pegasus/Bedrock has wrapped JSON inside a "message" string, parse it
    if (inner && typeof inner === "object" && typeof inner.message === "string") {
      try {
        return JSON.parse(inner.message);
      } catch {
        return inner;
      }
    }
    return inner;
  }
  // Fallback: if we have a "message" string that looks like JSON, parse it
  if (payload && typeof payload === "object" && typeof payload.message === "string") {
    try {
      return JSON.parse(payload.message);
    } catch {
      return payload;
    }
  }
  return payload;
};

export default function VideoAnalysisTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

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
  const [shotClassification, setShotClassification] = useState<any | null>(null);
  const [expandedDrill, setExpandedDrill] = useState<number | null>(null);
  const [wsEnabled, setWsEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | '3d'>('video');
  const [is3DPlaying, setIs3DPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isNonCricketVideo = bedrockAnalytics?.is_cricket_video === false;
  // Show 3D view and pose analytics by default (while loading) and only hide when explicitly not cricket
  const canShow3DView = bedrockAnalytics?.is_cricket_video !== false;
  const isFullAnalysisComplete = !!bedrockAnalytics && keypointsData.length > 0;


  // WebSocket integration
  const { isConnected: wsConnected, isConnecting: wsConnecting, error: wsError } = useVideoWebSocket({
    videoId: uploadedVideoId,
    enabled: wsEnabled,
    onKeypoints: useCallback((keypoints: PoseFrame[]) => {
      console.log('Received keypoints via WebSocket:', keypoints.length, 'frames');
      setKeypointsData(keypoints);
      setIsProcessing(false);
      setUploadStatus('Skeleton data received!');

      // Calculate FPS if video is already loaded
      if (videoDuration > 0) {
        calculateFPS(videoDuration, keypoints.length);
      }
    }, [videoDuration]),
    onBedrockAnalytics: useCallback((analytics: any) => {
      const normalized = normalizeAnalyticsPayload(analytics);
      setBedrockAnalytics(normalized);
      // Do not mark analysis complete yet; wait until pose/keypoints are also ready
    }, []),
    onShotClassification: useCallback((shot: any) => {
      setShotClassification(shot);
    }, []),
    onError: useCallback((errorMsg: string) => {
      setError(errorMsg);
      setIsProcessing(false);
    }, []),
    onComplete: useCallback(() => {
      setIsProcessing(false);
    }, []),
  });

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
      const url = buildApiUrl(`/videos/${videoId}/analysis?format=json`);
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

      const jsonData = await response.json();
      return jsonData;
    } catch (err: any) {
      console.error('Error fetching analysis data:', err);
      throw err;
    }
  };

  // Fetch bedrock analytics data from API
  const fetchBedrockAnalytics = async (videoId: string): Promise<any | null> => {
    try {
      const url = buildApiUrl(`/videos/${videoId}/bedrock-analytics`);
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

      const analyticsData = normalizeAnalyticsPayload(responseData);

      return analyticsData;
    } catch (err: any) {
      console.error('Error fetching bedrock analytics:', err);
      return null;
    }
  };

  // Calculate FPS based on video duration and frame count
  const calculateFPS = useCallback((duration: number, frameCount: number) => {
    if (duration > 0 && frameCount > 0) {
      const fps = frameCount / duration;
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

  // Mark analysis as complete only when both pose and Pegasus analytics are ready
  useEffect(() => {
    if (isFullAnalysisComplete) {
      setUploadStatus('Analysis complete!');
    }
  }, [isFullAnalysisComplete]);

  // If Pegasus decides this is NOT a cricket video, force view back to video and disable 3D
  useEffect(() => {
    if (isNonCricketVideo && viewMode === '3d') {
      setViewMode('video');
      setIs3DPlaying(false);
    }
  }, [isNonCricketVideo, viewMode]);

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

  // Upload video to API
  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadStatus('Requesting upload slot...');

    try {
      // 1) Ask backend for presigned URL
      const presignResponse = await fetch(buildApiUrl('/videos/presigned-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'video/mp4',
          file_size_bytes: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        throw new Error(`Could not get upload URL: ${presignResponse.status} - ${errorText}`);
      }

      const presignData = await presignResponse.json();
      setUploadedVideoId(presignData.video_id);
      const presignedContentType = presignData.content_type || file.type || 'application/octet-stream';

      // 2) Upload directly to S3 using the presigned URL
      setUploadStatus('Uploading to secure storage...');
      const uploadResponse = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': presignedContentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Cloud upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      // 3) Tell backend the upload is complete so it can enqueue analysis
      setUploadStatus('Finalising upload...');
      const completeResponse = await fetch(buildApiUrl('/videos/upload-complete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: presignData.video_id,
          file_size_bytes: file.size,
          checksum: undefined,
        }),
      });

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        throw new Error(`Failed to confirm upload: ${completeResponse.status} - ${errorText}`);
      }

      const completeData = await completeResponse.json();

      setUploadStatus('Upload complete! Connecting to live updates...');
      setIsProcessing(true);

      // Enable WebSocket connection
      setWsEnabled(true);

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
      // Reset previous errors
      setError(null);

      // Validate file size (50 MB = 50 * 1024 * 1024 bytes)
      const maxSizeInBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        setError('Video file size must not exceed 50 MB. Please upload a smaller file.');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const url = URL.createObjectURL(file);

      // Create a temporary video element to check duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';

      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration;

        // Validate duration (10 to 60 seconds)
        if (duration < 5) {
          setError('Video duration must be at least 5 seconds. Please upload a longer video.');
          URL.revokeObjectURL(url);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        if (duration > 60) {
          setError('Video duration must not exceed 60 seconds (1 minute). Please upload a shorter video.');
          URL.revokeObjectURL(url);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // All validations passed - proceed with upload
        // Note: We keep the blob URL alive here because the video player needs it
        setVideoFile(file);
        setVideoUrl(url);
        uploadVideo(file);
      };

      tempVideo.onerror = () => {
        setError('Failed to load video. Please ensure the file is a valid video format.');
        URL.revokeObjectURL(url);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      tempVideo.src = url;
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

        // Only draw skeleton overlay if the video is classified as cricket
        if (canShow3DView) {
          // 3. Calculate Frame Number using calculated FPS
          const frameIndex = Math.floor(video.currentTime * calculatedFPS);
          setCurrentFrame(frameIndex);

          // 4. Get Data & Draw
          const frameData = keypointsData[frameIndex];

          if (frameData) {
            // Get keypoints for all persons in the frame
            const allPersonsKeypoints = parseAllPersonsKeypoints(frameData);

            // Iterate through each person and draw their skeleton
            allPersonsKeypoints.forEach((rawKeypoints) => {
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
            });

            // Draw Bat Detections (if available)
            if (frameData.bats && frameData.bats.length > 0) {
              const scaledBats = scaleBatDetections(
                frameData.bats,
                video.videoWidth,
                video.videoHeight,
                canvas.width,
                canvas.height
              );

              scaledBats.forEach(bat => {
                drawBatDetection(ctx, bat, true);
              });
            }
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [keypointsData, calculatedFPS, canShow3DView]);

  useEffect(() => {
    if (videoUrl) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoUrl, renderLoop]);

  // Restore playback speed when switching back to video view or when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (video && viewMode === 'video' && playbackSpeed !== 1) {
      // Apply the stored playback speed to the video element
      video.playbackRate = playbackSpeed;
    }
  }, [viewMode, playbackSpeed, videoUrl]);

  const togglePlay = () => {
    if (viewMode === '3d') {
      // Toggle 3D animation independently
      setIs3DPlaying(!is3DPlaying);
    } else {
      // Toggle video playback
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
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!isMuted);
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);

    // Apply to video element only if in video mode
    const video = videoRef.current;
    if (video && viewMode === 'video') {
      video.playbackRate = speed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const seekTime = parseFloat(e.target.value);
      video.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      handleVideoMetadata();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 space-y-1 sm:space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400">
          Technique Analysis
        </h2>
        <p className="text-sm sm:text-base text-slate-400 px-2">
          AI-powered skeleton tracking for shot improvement
        </p>
      </div>

      {/* Status Messages */}
      {(isUploading || isProcessing || isFetchingAnalysis || wsConnecting) && (
        <div className="mb-3 sm:mb-4 bg-blue-900/30 border border-blue-700 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-3">
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base text-blue-200 font-medium break-words">
              {wsConnecting ? 'Connecting to live updates...' : uploadStatus}
            </p>
            {wsConnected && isProcessing && (
              <p className="text-blue-400 text-xs sm:text-sm mt-1">
                ✓ Connected - Waiting for analysis results...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success Message - only after full analysis (Pegasus + pose) is complete */}
      {uploadStatus && isFullAnalysisComplete && !isUploading && !isProcessing && !isFetchingAnalysis && !error && (
        <div className="mb-3 sm:mb-4 bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-emerald-200 font-medium break-words">✓ {uploadStatus}</p>
          {/* {keypointsData.length > 0 && (
            <p className="text-emerald-400 text-sm mt-1">
              Loaded {keypointsData.length} frames of skeleton data
            </p>
          )} */}
        </div>
      )}

      {(error || wsError) && (
        <div className="mb-3 sm:mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-red-200 font-medium">Error</p>
          <p className="text-red-400 text-xs sm:text-sm mt-1 break-words">{error || wsError}</p>
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
      <div className="w-full bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">

        {!videoUrl ? (
          // Upload State
          <div className="m-3 sm:m-4">
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`h-56 sm:h-64 md:h-72 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50'
                } transition-all group`}
            >
              <div className="bg-slate-800 p-3 sm:p-4 rounded-full mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
                )}
              </div>
              <p className="text-sm sm:text-base text-white font-medium px-4 text-center">
                {isUploading ? 'Uploading...' : 'Upload Cricket Video'}
              </p>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 px-4 text-center">MP4, MOV or AVI</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            {/* Validation Requirements Display */}
            <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
              <p className="text-slate-300 text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                Video Requirements
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">

                  <div className="flex-1">
                    <p className="text-slate-300 text-xs sm:text-sm">
                      <span className="font-semibold text-emerald-400">Duration:</span> Between 5 to 60 seconds
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-slate-300 text-xs sm:text-sm">
                      <span className="font-semibold text-blue-400">File Size:</span> Maximum 50 MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Player State with Tabbed Views
          <div className="relative flex flex-col items-center bg-black">
            {/* Tab Switcher - Only show when keypoints data is available AND it's a cricket video */}
            {keypointsData.length > 0 && canShow3DView && (
              <div className="w-full bg-slate-800/90 border-b border-slate-700 p-3 sm:p-4 flex items-center justify-center gap-2 sm:gap-4">
                <button
                  onClick={() => setViewMode('video')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${viewMode === 'video'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                >
                  Pose Analytics
                </button>
                {/* 3D view is only available when the video is explicitly classified as cricket */}
                {canShow3DView && (
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${viewMode === '3d'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                  >
                    3D View
                  </button>
                )}
              </div>
            )}

            {/* Conditional Rendering: Video or 3D View */}
            {viewMode === 'video' ? (
              // Original Video Player with Canvas Overlay
              <div className="relative inline-block">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="max-h-[65vh] w-auto block mx-auto"
                  playsInline
                  muted={isMuted}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
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
            ) : (
              // 3D Skeleton View - Independent Animation
              <ThreeDSkeletonView
                keypointsData={keypointsData}
                isPlaying={is3DPlaying}
                fps={calculatedFPS}
                playbackSpeed={playbackSpeed}
              />
            )}

            {/* Controls Bar - Shared for Both Views */}
            <div className="w-full bg-slate-900/90 backdrop-blur border-t border-slate-800 p-3 sm:p-4 flex flex-col gap-3">
              {/* Seek Bar - Only for video mode */}
              {viewMode === 'video' && (
                <div className="w-full">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-emerald-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-3
                      [&::-moz-range-thumb]:h-3
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-emerald-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${(currentTime / (duration || 1)) * 100}%, rgb(51 65 85) ${(currentTime / (duration || 1)) * 100}%, rgb(51 65 85) 100%)`
                    }}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400 font-mono">{formatTime(currentTime)}</span>
                    <span className="text-xs text-slate-400 font-mono">{formatTime(duration)}</span>
                  </div>
                </div>
              )}

              {/* Playback Controls Row */}
              <div className="flex items-center gap-3 sm:gap-4 w-full justify-between">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-white transition-colors flex-shrink-0"
                >
                  {(viewMode === 'video' ? isPlaying : is3DPlaying) ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-1" />
                  )}
                </button>

                {/* Mute Button - Only visible in video mode */}
                {viewMode === 'video' && (
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors flex-shrink-0"
                  >
                    {isMuted ? (
                      <VolumeX size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                )}

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-slate-200 text-xs sm:text-sm font-medium">
                    {viewMode === 'video' ? 'Pose Analytics' : '3D Skeleton View'}
                  </span>
                  <span className="text-slate-500 text-[10px] sm:text-xs font-mono truncate">
                    {viewMode === 'video' ? (
                      <>Frame: {currentFrame} / {keypointsData.length} ({calculatedFPS.toFixed(1)} FPS)</>
                    ) : (
                      <>{is3DPlaying ? '▶ Playing' : '⏸ Paused'} • {keypointsData.length} frames • {calculatedFPS.toFixed(1)} FPS</>
                    )}
                  </span>
                </div>

                {/* Playback Speed Controls - Inline for Desktop */}
                <div className="hidden md:flex items-center gap-1.5 bg-slate-800 rounded-lg p-1">
                  {[0.5, 0.75, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handlePlaybackSpeedChange(speed)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${playbackSpeed === speed
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* New Video Button Row */}
                <button
                  onClick={() => {
                    setVideoUrl("");
                    setVideoFile(null);
                    setUploadedVideoId(null);
                    setKeypointsData([]);
                    setUploadStatus("");
                    setError(null);
                    setBedrockAnalytics(null);
                    setIsProcessing(false);
                    setWsEnabled(false);
                    setViewMode('video');
                    setIs3DPlaying(false);
                    setPlaybackSpeed(1);
                    setCurrentTime(0);
                    setDuration(0);
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm w-full sm:w-auto justify-center"
                >
                  <RefreshCw size={14} />
                  <span>New Video</span>
                </button>
              </div>

              {/* Playback Speed Controls - Separate Row for Mobile */}
              <div className="flex md:hidden items-center justify-center gap-1.5 bg-slate-800 rounded-lg p-1 w-full">
                {[0.5, 0.75, 1, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handlePlaybackSpeedChange(speed)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${playbackSpeed === speed
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Bedrock Analytics Display */}
        {bedrockAnalytics && (
          <div className="w-full mt-6 sm:mt-8 space-y-6 sm:space-y-8 p-4 sm:p-6 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                  Analysis Results
                </h2>
                <p className="text-sm sm:text-base text-slate-400">AI-powered insights to improve your technique</p>
              </div>
              {/* <button
                onClick={async () => {
                  if (uploadedVideoId) {
                    const data = await fetchBedrockAnalytics(uploadedVideoId);
                    if (data) {
                      console.log('Received Bedrock analytics via WebSocket DATA', data);
                      setBedrockAnalytics(data);
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm sm:text-base font-medium transition-all shadow-lg hover:shadow-emerald-500/20 w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button> */}
            </div>

            {/* Non-cricket message handling */}
            {bedrockAnalytics.is_cricket_video === false && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6">
                <p className="text-sm sm:text-base text-amber-100 font-semibold mb-1">
                  Not a cricket sports video.
                </p>
                <p className="text-xs sm:text-sm text-amber-200">
                  {bedrockAnalytics.explanation?.long_form ||
                    'Pegasus analysed the footage and determined it is not suitable for detailed cricket technique feedback.'}
                </p>
              </div>
            )}

            {/* Shot classification summary (model-based, separate from Pegasus) */}
            {shotClassification && (
              <div className="mb-4 sm:mb-6 bg-slate-900/70 border border-emerald-600/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-emerald-300 mb-1">
                    Shot classification
                  </h3>
                  <p className="text-sm sm:text-base text-slate-200">
                    {shotClassification.shot_label
                      ? shotClassification.shot_label
                        .replace(/[-_]/g, ' ')
                        .split(' ')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                      : 'Unknown shot'}
                  </p>
                </div>
                {typeof shotClassification.confidence_percent === 'number' && (
                  <div className="flex items-center justify-center px-4 py-2 rounded-full bg-emerald-600/20 border border-emerald-500/40">
                    <span className="text-sm sm:text-base font-semibold text-emerald-300">
                      {shotClassification.confidence_percent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Summary Section - Enhanced (only for cricket videos) */}
            {bedrockAnalytics.is_cricket_video !== false && (
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-900/20 rounded-xl sm:rounded-2xl border border-emerald-500/30 p-5 sm:p-8 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                      {bedrockAnalytics.summary?.headline}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-semibold border border-emerald-500/30">
                        {getSkillLevel(bedrockAnalytics.summary?.overall_score)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/30 border-4 border-emerald-300/20 self-center sm:self-auto">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-white">
                        {bedrockAnalytics.summary?.overall_score}
                      </div>
                      <div className="text-[10px] sm:text-xs text-emerald-50 font-medium">/ 10</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Observations - Enhanced (only for cricket videos) */}
            {bedrockAnalytics.is_cricket_video !== false &&
              bedrockAnalytics.key_observations &&
              bedrockAnalytics.key_observations.length > 0 && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    Key Observations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {bedrockAnalytics.key_observations.map((obs: any, idx: number) => (
                      <div
                        key={idx}
                        className="relative bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-4 sm:p-6 hover:border-emerald-500/50 transition-all group hover:shadow-xl hover:shadow-emerald-500/10"
                      >
                        <div className="flex items-start gap-3 sm:gap-5">
                          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/50 flex-shrink-0 shadow-lg">
                            <div className="text-center">
                              <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                                {obs.score}
                              </div>
                              <div className="text-[10px] sm:text-xs text-emerald-300 font-medium">/10</div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2 group-hover:text-emerald-400 transition-colors">
                              {obs.title}
                            </h4>
                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                              {obs.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Improvement Areas - Enhanced (only for cricket videos) */}
            {bedrockAnalytics.is_cricket_video !== false &&
              bedrockAnalytics.improvement_areas &&
              bedrockAnalytics.improvement_areas.length > 0 && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    Improvement Areas
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {bedrockAnalytics.improvement_areas.map((area: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-4 sm:p-5 hover:border-yellow-500/50 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="mt-0.5 sm:mt-1 p-1.5 sm:p-2 rounded-lg bg-yellow-500/10 flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h4 className="text-base sm:text-lg font-bold text-white">
                                {area.title}
                              </h4>
                              <span
                                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide inline-block ${area.priority === 'high'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : area.priority === 'medium'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  }`}
                              >
                                {area.priority}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{area.detail}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Suggested Drills - Enhanced (only for cricket videos) */}
            {bedrockAnalytics.is_cricket_video !== false &&
              bedrockAnalytics.suggested_drills &&
              bedrockAnalytics.suggested_drills.length > 0 && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    Suggested Drills
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {bedrockAnalytics.suggested_drills.map((drill: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-800/70 rounded-lg sm:rounded-xl border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                      >
                        <button
                          onClick={() => setExpandedDrill(expandedDrill === idx ? null : idx)}
                          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2">
                              {drill.name}
                            </h4>
                            {/* <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-semibold border border-emerald-500/30">
                              {drill.focus_area}
                            </span> */}
                          </div>
                          <div className="ml-2 sm:ml-4 flex-shrink-0">
                            <div
                              className={`transform transition-transform duration-200 ${expandedDrill === idx ? 'rotate-180' : ''}`}
                            >
                              <svg
                                className="w-6 h-6 text-slate-400"
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
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-700 bg-slate-900/30">
                            <p className="text-slate-300 text-xs sm:text-sm mt-3 sm:mt-4 leading-relaxed">
                              {drill.description}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Explanation - Enhanced (only for cricket videos) */}
            {bedrockAnalytics.is_cricket_video !== false && bedrockAnalytics.explanation && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-4 sm:p-6 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  Detailed Explanation
                </h3>
                <div className="space-y-4 sm:space-y-5">
                  <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                    {bedrockAnalytics.explanation.long_form}
                  </p>
                  {bedrockAnalytics.explanation.notes && bedrockAnalytics.explanation.notes.length > 0 && (
                    <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                      <h4 className="text-sm sm:text-base text-white font-bold mb-3 sm:mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                        Key Focus Points
                      </h4>
                      <ul className="space-y-2 sm:space-y-3">
                        {bedrockAnalytics.explanation.notes.map((note: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 sm:gap-3 text-slate-300 text-xs sm:text-sm">
                            <span className="text-emerald-400 text-base sm:text-lg font-bold mt-0.5 flex-shrink-0">•</span>
                            <span className="leading-relaxed">{note}</span>
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

        {/* Analytics Shimmer Loading State - Shows when video is loaded but analytics aren't ready */}
        {videoUrl && !bedrockAnalytics && (
          <div className="w-full mt-8 space-y-8 p-6 bg-slate-900/50 animate-pulse">
            {/* Header Shimmer */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <div className="h-8 bg-slate-700/50 rounded-lg w-64 mb-2"></div>
                <div className="h-4 bg-slate-700/30 rounded w-96"></div>
              </div>
              <div className="h-10 w-28 bg-slate-700/50 rounded-lg"></div>
            </div>

            {/* Summary Shimmer */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700/20 rounded-2xl border border-slate-700/50 p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-7 bg-slate-700/50 rounded-lg w-3/4"></div>
                  <div className="h-6 bg-slate-700/30 rounded w-32"></div>
                </div>
                <div className="w-28 h-28 rounded-full bg-slate-700/50"></div>
              </div>
            </div>

            {/* Key Observations Shimmer */}
            <div>
              <div className="h-7 bg-slate-700/50 rounded-lg w-56 mb-5"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                    <div className="flex items-start gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-slate-700/50"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-slate-700/50 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                        <div className="h-4 bg-slate-700/30 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement Areas Shimmer */}
            <div>
              <div className="h-7 bg-slate-700/50 rounded-lg w-56 mb-5"></div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-700/50"></div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-5 bg-slate-700/50 rounded w-48"></div>
                          <div className="h-5 w-16 bg-slate-700/50 rounded-full"></div>
                        </div>
                        <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drills Shimmer */}
            <div>
              <div className="h-7 bg-slate-700/50 rounded-lg w-56 mb-5"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-slate-700/50 rounded w-64"></div>
                        <div className="h-5 w-24 bg-slate-700/50 rounded-full"></div>
                      </div>
                      <div className="w-6 h-6 bg-slate-700/50 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loading Text */}
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Analyzing your technique...</p>
              <p className="text-slate-400 text-sm mt-2">This may take a few moments</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
