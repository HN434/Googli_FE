"use client";

import { Suspense, useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line } from "@react-three/drei";
import { Button } from "@/components/ui/Button";
import * as THREE from "three";

// MediaPipe Pose connections for skeleton (33 landmarks)
const POSE_CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
];

const HUMAN_SCALE = 1.8;
const HUMAN_Y_OFFSET = 0;
const DEPTH_SCALE = 0.5; // Reduced depth scale to prevent stretching in side view

// TypeScript Interfaces
interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface PoseFrame {
  landmarks?: Landmark[];
  landmarksArray?: number[];
  timestamp?: number;
  confidence?: number;
}

interface AnimatedSkeletonProps {
  poseData: PoseFrame[];
  currentFrame: number;
  showSkeleton: boolean;
  showBodyParts: boolean;
  showBat: boolean;
  showHelmet: boolean;
}

// Helper function to convert landmark to 3D position
const getLandmarkBasePosition = (landmark: Landmark): THREE.Vector3 => {
  return new THREE.Vector3(
    (landmark.x - 0.5) * HUMAN_SCALE,
    (1 - landmark.y) * HUMAN_SCALE + HUMAN_Y_OFFSET,
    -landmark.z * DEPTH_SCALE
  );
};

// Normalize landmarks from different formats
const normalizeLandmarks = (frame: PoseFrame): Landmark[] | null => {
  if (!frame) return null;

  if (frame.landmarks && frame.landmarks.length > 0) {
    return frame.landmarks;
  }

  if (frame.landmarksArray && frame.landmarksArray.length === 33 * 4) {
    const landmarks: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: frame.landmarksArray[i * 4],
        y: frame.landmarksArray[i * 4 + 1],
        z: frame.landmarksArray[i * 4 + 2],
        visibility: frame.landmarksArray[i * 4 + 3]
      });
    }
    return landmarks;
  }

  return null;
};

// Animated 3D Skeleton Component with Cricket Equipment
function AnimatedSkeleton({
  poseData,
  currentFrame,
  showSkeleton,
  showBodyParts,
  showBat,
  showHelmet
}: AnimatedSkeletonProps) {
  const jointsRef = useRef<THREE.Mesh[]>([]);
  const bonesRef = useRef<THREE.Mesh[]>([]);
  const bodyPartsRef = useRef<{ [key: string]: THREE.Mesh | THREE.Group }>({});

  if (!poseData || poseData.length === 0) return null;

  const frame = poseData[currentFrame];
  const landmarks = normalizeLandmarks(frame);

  if (!landmarks) return null;

  // Convert landmarks to 3D positions
  const positions = landmarks.map(landmark => getLandmarkBasePosition(landmark));

  // Create joints (spheres)
  const joints = positions.map((position, i) => {
    const landmark = landmarks[i];
    const isVisible = landmark.visibility === undefined || landmark.visibility >= 0.1;

    if (!isVisible) return null;

    let jointRadius = 0.03;
    if (i === 0) jointRadius = 0.06; // Head
    else if ([11, 12, 23, 24].includes(i)) jointRadius = 0.04; // Major joints
    else if ([13, 14, 15, 16].includes(i)) jointRadius = 0.035; // Elbows and wrists
    else if ([25, 26, 27, 28].includes(i)) jointRadius = 0.04; // Knees and ankles

    const color = new THREE.Color();
    const visibility = landmark.visibility ?? 0;
    if (visibility > 0.8) color.setRGB(0, 1, 0);
    else if (visibility > 0.5) color.setRGB(0, 1, 1);
    else color.setRGB(1, 1, 0);

    return (
      <mesh key={`joint-${i}`} position={position} visible={showSkeleton}>
        <sphereGeometry args={[jointRadius, 16, 16]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          shininess={80}
        />
      </mesh>
    );
  }).filter(Boolean);

  // Create bones (lines connecting joints)
  const bones = POSE_CONNECTIONS.map(([start, end], i) => {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];
    const startVisible = startLandmark.visibility === undefined || startLandmark.visibility >= 0.1;
    const endVisible = endLandmark.visibility === undefined || endLandmark.visibility >= 0.1;

    if (!startVisible || !endVisible || !showSkeleton) return null;

    const startPos = positions[start];
    const endPos = positions[end];

    return (
      <Line
        key={`bone-${i}`}
        points={[startPos, endPos]}
        color="#00aaff"
        lineWidth={3}
        transparent
        opacity={0.95}
      />
    );
  }).filter(Boolean);

  // Cricket Pitch
  const pitch = (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshLambertMaterial color={0x2d5016} side={THREE.DoubleSide} />
      </mesh>

      {/* Pitch strip */}
      <mesh position={[0, 0.01, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.02, 22]} />
        <meshLambertMaterial color={0x8B7355} />
      </mesh>

      {/* Creases */}
      <mesh position={[0, 0.02, -2]}>
        <boxGeometry args={[1.5, 0.03, 0.05]} />
        <meshLambertMaterial color={0xffffff} />
      </mesh>
      <mesh position={[0, 0.02, 0.78]}>
        <boxGeometry args={[1.5, 0.03, 0.05]} />
        <meshLambertMaterial color={0xffffff} />
      </mesh>
    </group>
  );

  // Helper function to create body part between two joints
  const createBodyPart = (
    startIdx: number,
    endIdx: number,
    radius: number,
    color: number,
    key: string
  ) => {
    const startLandmark = landmarks[startIdx];
    const endLandmark = landmarks[endIdx];
    const startVisible = startLandmark?.visibility === undefined || startLandmark?.visibility >= 0.1;
    const endVisible = endLandmark?.visibility === undefined || endLandmark?.visibility >= 0.1;

    if (!startVisible || !endVisible || !showBodyParts) return null;

    const startPos = positions[startIdx];
    const endPos = positions[endIdx];

    const midpoint = new THREE.Vector3()
      .addVectors(startPos, endPos)
      .multiplyScalar(0.5);

    const distance = startPos.distanceTo(endPos);
    const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();

    // Calculate rotation to align cylinder with direction
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);

    return (
      <mesh key={key} position={midpoint} quaternion={quaternion}>
        <capsuleGeometry args={[radius, distance * 0.8, 8, 16]} />
        <meshPhongMaterial color={color} shininess={10} />
      </mesh>
    );
  };

  // Body parts
  const bodyParts = showBodyParts ? (
    <group>
      {/* Head */}
      {landmarks[0] && (landmarks[0].visibility ?? 0) >= 0.1 && (
        <mesh position={positions[0]}>
          <sphereGeometry args={[0.11, 32, 32]} />
          <meshPhongMaterial color={0xFFDBB3} shininess={20} />
        </mesh>
      )}

      {/* Helmet */}
      {showHelmet && landmarks[0] && (landmarks[0].visibility ?? 0) >= 0.1 && (
        <group position={[positions[0].x, positions[0].y + 0.02, positions[0].z]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.13, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshPhongMaterial color={0x1a1a1a} shininess={50} />
          </mesh>
          {/* Helmet grille */}
          <mesh position={[0, -0.02, 0.12]}>
            <boxGeometry args={[0.14, 0.12, 0.02]} />
            <meshPhongMaterial color={0x333333} transparent opacity={0.7} shininess={80} />
          </mesh>
        </group>
      )}

      {/* Torso */}
      {landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24] && (
        (() => {
          const shoulderCenter = new THREE.Vector3()
            .addVectors(positions[11], positions[12])
            .multiplyScalar(0.5);
          const hipCenter = new THREE.Vector3()
            .addVectors(positions[23], positions[24])
            .multiplyScalar(0.5);
          const torsoCenter = new THREE.Vector3()
            .addVectors(shoulderCenter, hipCenter)
            .multiplyScalar(0.5);
          const torsoDirection = new THREE.Vector3()
            .subVectors(shoulderCenter, hipCenter)
            .normalize();
          const axis = new THREE.Vector3(0, 1, 0);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, torsoDirection);
          const torsoHeight = shoulderCenter.distanceTo(hipCenter);

          return (
            <mesh position={torsoCenter} quaternion={quaternion}>
              <capsuleGeometry args={[0.15, torsoHeight * 0.8, 8, 16]} />
              <meshPhongMaterial color={0xFFFFFF} shininess={10} />
            </mesh>
          );
        })()
      )}

      {/* Arms - Upper */}
      {createBodyPart(11, 13, 0.05, 0xFFFFFF, 'left-upper-arm')}
      {createBodyPart(12, 14, 0.05, 0xFFFFFF, 'right-upper-arm')}

      {/* Arms - Forearms */}
      {createBodyPart(13, 15, 0.04, 0xFFDBB3, 'left-forearm')}
      {createBodyPart(14, 16, 0.04, 0xFFDBB3, 'right-forearm')}

      {/* Hands with gloves */}
      {landmarks[15] && (landmarks[15].visibility ?? 0) >= 0.1 && (
        <mesh position={positions[15]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshPhongMaterial color={0xF5F5DC} shininess={5} />
        </mesh>
      )}
      {landmarks[16] && (landmarks[16].visibility ?? 0) >= 0.1 && (
        <mesh position={positions[16]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshPhongMaterial color={0xF5F5DC} shininess={5} />
        </mesh>
      )}

      {/* Legs - Thighs */}
      {createBodyPart(23, 25, 0.08, 0xFFFFFF, 'left-thigh')}
      {createBodyPart(24, 26, 0.08, 0xFFFFFF, 'right-thigh')}

      {/* Legs - Shins with pads */}
      {createBodyPart(25, 27, 0.06, 0xF0F0F0, 'left-shin')}
      {createBodyPart(26, 28, 0.06, 0xF0F0F0, 'right-shin')}

      {/* Feet - Cricket shoes */}
      {landmarks[27] && (landmarks[27].visibility ?? 0) >= 0.1 && (
        <mesh position={positions[27]}>
          <boxGeometry args={[0.08, 0.06, 0.12]} />
          <meshPhongMaterial color={0xFFFFFF} shininess={30} />
        </mesh>
      )}
      {landmarks[28] && (landmarks[28].visibility ?? 0) >= 0.1 && (
        <mesh position={positions[28]}>
          <boxGeometry args={[0.08, 0.06, 0.12]} />
          <meshPhongMaterial color={0xFFFFFF} shininess={30} />
        </mesh>
      )}
    </group>
  ) : null;

  // Cricket Bat
  const cricketBat = showBat && landmarks[15] && landmarks[16] ? (
    (() => {
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftVisible = (leftWrist.visibility ?? 0) >= 0.1;
      const rightVisible = (rightWrist.visibility ?? 0) >= 0.1;

      if (!leftVisible && !rightVisible) return null;

      // Calculate bat position between hands (weighted toward bottom hand)
      let batPosition: THREE.Vector3;
      if (leftVisible && rightVisible) {
        const bottomHand = positions[16].clone();
        const topHand = positions[15].clone();
        batPosition = bottomHand.multiplyScalar(0.7).add(topHand.multiplyScalar(0.3));
        batPosition.y -= 0.1;
      } else if (leftVisible) {
        batPosition = positions[15].clone();
        batPosition.y -= 0.12;
      } else {
        batPosition = positions[16].clone();
        batPosition.y -= 0.12;
      }

      // Calculate bat orientation
      let batRotation: THREE.Euler;
      if (leftVisible && rightVisible) {
        const handAxis = new THREE.Vector3()
          .subVectors(positions[15], positions[16])
          .normalize();
        // Simple rotation for demo
        batRotation = new THREE.Euler(-Math.PI / 6, 0, 0);
      } else {
        batRotation = new THREE.Euler(-Math.PI / 6, 0, 0);
      }

      return (
        <group position={batPosition} rotation={batRotation}>
          {/* Bat blade */}
          <mesh position={[0, -0.43, 0]}>
            <boxGeometry args={[0.108, 0.86, 0.04]} />
            <meshPhongMaterial color={0xD4A574} shininess={15} />
          </mesh>

          {/* Sweet spot marking */}
          <mesh position={[0, -0.3, 0.021]}>
            <planeGeometry args={[0.09, 0.15]} />
            <meshBasicMaterial color={0xA0826D} transparent opacity={0.3} />
          </mesh>

          {/* Bat handle */}
          <mesh position={[0, 0.265, 0]}>
            <cylinderGeometry args={[0.018, 0.025, 0.33, 12]} />
            <meshPhongMaterial color={0x8B4513} shininess={10} />
          </mesh>
        </group>
      );
    })()
  ) : null;

  return (
    <group>
      {pitch}
      {joints}
      {bones}
      {bodyParts}
      {cricketBat}
    </group>
  );
}

// Loading fallback
function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#10b981" wireframe />
    </mesh>
  );
}

// Scene setup component
function SceneSetup() {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} color={0x88ccff} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Grid Helper */}
      <gridHelper args={[30, 30, "#1f2937", "#374151"]} />
    </>
  );
}

// Main Component
export default function ThreeDVideo() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [poseData, setPoseData] = useState<PoseFrame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'top' | 'free'>('side');
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Display options
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showBodyParts, setShowBodyParts] = useState(true);
  const [showBat, setShowBat] = useState(true);
  const [showHelmet, setShowHelmet] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackIntervalRef = useRef<number | null>(null);
  const cameraControlsRef = useRef<any>(null);

  // Handle video file upload
  const handleVideoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage("");

    // Basic file validation
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please upload a valid video file");
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      setErrorMessage(`Video file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) must be less than 50 MB`);
      return;
    }

    // Create video URL for validation
    const url = URL.createObjectURL(file);

    // Validate video duration
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;

      if (duration < 10) {
        setErrorMessage(`Video duration (${duration.toFixed(1)}s) is too short. Minimum is 10 seconds.`);
        URL.revokeObjectURL(url);
        return;
      }

      if (duration > 60) {
        setErrorMessage(`Video duration (${duration.toFixed(1)}s) is too long. Maximum is 60 seconds.`);
        URL.revokeObjectURL(url);
        return;
      }

      // Video is valid
      setVideoFile(file);
      setVideoUrl(url);
      setPoseData([]);
      setCurrentFrame(0);
      setErrorMessage("");
    };

    video.onerror = () => {
      setErrorMessage("Failed to load video. Please try a different file.");
      URL.revokeObjectURL(url);
    };

    video.src = url;
  }, []);

  // Process video to extract pose data using MediaPipe
  const processVideo = useCallback(async () => {
    if (!videoFile || !videoRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setErrorMessage("");

    try {
      const video = videoRef.current;

      // Wait for video metadata
      if (video.readyState < 2) {
        await new Promise((resolve) => {
          video.addEventListener('loadeddata', () => resolve(null), { once: true });
        });
      }

      console.log('Starting MediaPipe pose detection...');

      // Import MediaPipe processor
      const { processVideoToPose } = await import('@/lib/poseProcessor');

      // Process video with real MediaPipe Pose detection
      const frames = await processVideoToPose(
        video,
        (progress) => {
          setProcessingProgress(progress);
        },
        (frameIndex, totalFrames) => {
          console.log(`Processing frame ${frameIndex + 1}/${totalFrames}`);
        }
      );

      console.log(`Successfully processed ${frames.length} frames`);

      // Filter out frames with no pose detected (optional - keep for continuity)
      const validFrames = frames.filter(f => f.landmarks && f.landmarks.length > 0);
      console.log(`${validFrames.length} frames with detected poses`);

      if (validFrames.length === 0) {
        setErrorMessage("No pose detected in video. Please ensure the person is clearly visible.");
        setIsProcessing(false);
        return;
      }

      // Use all frames (including those without detections for smooth playback)
      setPoseData(frames);
      setProcessingProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
      }, 500);

    } catch (error) {
      console.error("Error processing video:", error);
      setErrorMessage(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [videoFile]);


  // Playback control
  useEffect(() => {
    if (isPlaying && poseData.length > 0) {
      const fps = 25;
      const interval = (1000 / fps) / playbackSpeed;

      playbackIntervalRef.current = window.setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= poseData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    }
  }, [isPlaying, playbackSpeed, poseData.length]);

  // Camera preset controls
  const setCameraPreset = useCallback((view: typeof cameraView) => {
    setCameraView(view);
    // Camera positions would be updated via the Camera component
  }, []);

  // Control functions
  const togglePlayPause = () => setIsPlaying(!isPlaying);
  const reset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };
  const stepForward = () => {
    if (currentFrame < poseData.length - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };
  const stepBackward = () => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [videoUrl]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-400 mb-3">
          3D Cricket Pose Analysis
        </h2>
        <p className="text-gray-400 text-sm">
          Upload a cricket video to analyze batting technique in 3D
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-6 bg-[#0f1f3a] border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isProcessing}
          >
            {videoFile ? "Change Video" : "Upload Video"}
          </Button>

          {videoFile && !poseData.length && (
            <Button
              onClick={processVideo}
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isProcessing}
            >
              {isProcessing ? `Processing... ${processingProgress}%` : "Analyze Video"}
            </Button>
          )}

          {videoFile && (
            <span className="text-gray-400 text-sm">
              {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {errorMessage}
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-400">
              Processing with MediaPipe AI... {processingProgress}%
            </p>
            <p className="text-center text-xs text-gray-500 mt-1">
              This may take a few moments depending on video length
            </p>
          </div>
        )}

        {/* Video requirements */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p className="mb-1">
            <strong className="text-gray-400">Requirements:</strong> 10-60 seconds duration, max 50 MB file size
          </p>
          <p className="flex items-center justify-center gap-1 text-emerald-400">
            <span>✓</span>
            <span>Using MediaPipe AI for accurate pose detection</span>
          </p>
        </div>

        {/* Hidden video element for processing */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            preload="metadata"
          />
        )}
      </div>

      {/* 3D Canvas */}
      {poseData.length > 0 && (
        <>
          <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl overflow-hidden mb-6">
            <div className="w-full h-[600px] relative">
              <Canvas shadows>
                <PerspectiveCamera
                  makeDefault
                  position={
                    cameraView === 'front' ? [0, 1.2, 5] :
                      cameraView === 'side' ? [4, 1.2, -2] :
                        cameraView === 'top' ? [0, 5, -2] :
                          [4, 1.2, 0]
                  }
                  fov={50}
                />

                <SceneSetup />

                <Suspense fallback={<Loader />}>
                  <AnimatedSkeleton
                    poseData={poseData}
                    currentFrame={currentFrame}
                    showSkeleton={showSkeleton}
                    showBodyParts={showBodyParts}
                    showBat={showBat}
                    showHelmet={showHelmet}
                  />
                </Suspense>

                <OrbitControls
                  ref={cameraControlsRef}
                  enableDamping
                  dampingFactor={0.05}
                  target={[0, 0.9, -2]}
                  minDistance={2}
                  maxDistance={20}
                  maxPolarAngle={Math.PI / 2}
                />
              </Canvas>
            </div>

            {/* Controls Info */}
            <div className="bg-[#0a1628] p-4 border-t border-gray-800">
              <div className="flex flex-wrap gap-6 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Left Click + Drag to Rotate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Right Click + Drag to Pan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Scroll to Zoom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-6 mb-6">
            <div className="space-y-6">
              {/* Play/Pause/Step Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button onClick={reset} variant="secondary" className="bg-gray-700 hover:bg-gray-600">
                  Reset
                </Button>
                <Button onClick={stepBackward} variant="secondary" className="bg-gray-700 hover:bg-gray-600">
                  ← Step
                </Button>
                <Button onClick={togglePlayPause} variant="primary" className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]">
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={stepForward} variant="secondary" className="bg-gray-700 hover:bg-gray-600">
                  Step →
                </Button>
              </div>

              {/* Frame Scrubber */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Frame: {currentFrame + 1} / {poseData.length}
                  {poseData[currentFrame]?.timestamp &&
                    ` (${poseData[currentFrame].timestamp.toFixed(2)}s)`
                  }
                </label>
                <input
                  type="range"
                  min="0"
                  max={poseData.length - 1}
                  value={currentFrame}
                  onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Speed Control */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Playback Speed: {playbackSpeed.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="2"
                  step="0.25"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Camera & Display Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera Controls */}
            <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-indigo-400 mb-4">Camera View</h3>
              <div className="grid grid-cols-2 gap-3">
                {(['front', 'side', 'top', 'free'] as const).map((view) => (
                  <Button
                    key={view}
                    onClick={() => setCameraPreset(view)}
                    variant={cameraView === view ? 'primary' : 'secondary'}
                    className={cameraView === view
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-indigo-400 mb-4">Display Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSkeleton}
                    onChange={(e) => setShowSkeleton(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Show Skeleton</span>
                </label>
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBodyParts}
                    onChange={(e) => setShowBodyParts(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Show Body Parts</span>
                </label>
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBat}
                    onChange={(e) => setShowBat(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Show Cricket Bat</span>
                </label>
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHelmet}
                    onChange={(e) => setShowHelmet(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Show Helmet</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!videoFile && (
        <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🏏</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No Video Uploaded
          </h3>
          <p className="text-gray-500 mb-6">
            Upload a cricket video to analyze batting technique in 3D
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Upload Video
          </Button>
        </div>
      )}
    </div>
  );
}