'use client';

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line, Environment } from "@react-three/drei";
import * as THREE from "three";
import { type PoseFrame } from "@/utils/poseUtils";

// --- COCO 17-POINT SKELETON TOPOLOGY ---
const COCO_BONES = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head/Face
  [5, 6], [5, 11], [6, 12], [11, 12], // Torso/Hips
  [6, 8], [8, 10], // Right Arm (Shoulder-Elbow-Wrist)
  [5, 7], [7, 9], // Left Arm (Shoulder-Elbow-Wrist)
  [12, 14], [14, 16], // Right Leg (Hip-Knee-Ankle)
  [11, 13], [13, 15] // Left Leg (Hip-Knee-Ankle)
];
const PLAYER_HEIGHT_WORLD = 1.7;
const CREASE_Z = 1.5;
const DEPTH_FACTOR = 0.35;
const PLAYER_X_SPACING = 0.45; // separation for multiple players


// --- 3D POSE DATA PROCESSING WITH DYNAMIC SCALING ---
function process2DPoseData(rawData: PoseFrame[]): number[][][][] {
  if (!rawData.length) return [];

  const processed: number[][][][] = [];

  const dist2D = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]);

  const avgPoint = (a?: number[], b?: number[]) =>
    a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null;

  // --------------------------------------------------
  // 🎯 CALCULATE BOUNDING BOX SIZE FOR NORMALIZATION
  // --------------------------------------------------
  const getBoundingBoxHeight = (keypoints: number[][]) => {
    const validY = keypoints.map(kp => kp[1]).filter(y => y > 0);
    if (validY.length === 0) return 0;
    return Math.max(...validY) - Math.min(...validY);
  };

  // Collect bounding box heights for all persons across all frames
  const bboxHeights: number[] = [];

  rawData.forEach(frame => {
    frame.persons?.forEach(p => {
      const bboxHeight = getBoundingBoxHeight(p.keypoints);
      if (bboxHeight > 0) {
        bboxHeights.push(bboxHeight);
      }
    });
  });

  // Calculate median bounding box height to use as reference
  bboxHeights.sort((a, b) => a - b);
  const medianBboxHeight = bboxHeights[Math.floor(bboxHeights.length / 2)] || 500;

  // --------------------------------------------------
  // 🎯 REFERENCE SCALE CALCULATION
  // This ensures all players appear at ~1.7m height regardless of camera distance
  // --------------------------------------------------
  const TARGET_HEIGHT_WORLD = 1.7; // Standard cricket player height in world units
  const REFERENCE_SCALE = TARGET_HEIGHT_WORLD / medianBboxHeight;

  console.log(`📊 Dynamic Scaling Info:
    - Median Bounding Box Height: ${medianBboxHeight.toFixed(2)}px
    - Reference Scale Factor: ${REFERENCE_SCALE.toFixed(6)}
    - Target World Height: ${TARGET_HEIGHT_WORLD}m
  `);

  // --------------------------------------------------
  // 2️⃣ FRAME PROCESSING WITH NORMALIZATION
  // --------------------------------------------------
  rawData.forEach(frame => {
    const framePersons: number[][][] = [];

    frame.persons?.forEach((person, idx) => {
      const kp = person.keypoints;

      const hipCenter = avgPoint(kp[11], kp[12]);
      if (!hipCenter) return;

      const footY = Math.max(kp[15]?.[1] ?? 0, kp[16]?.[1] ?? 0);

      // --------------------------------------------------
      // 🎯 DYNAMIC PER-PERSON SCALING
      // Calculate how much this person deviates from the median
      // --------------------------------------------------
      const personBboxHeight = getBoundingBoxHeight(kp);

      // Normalization factor: larger bbox = scale down, smaller bbox = scale up
      const normalizationFactor = medianBboxHeight / (personBboxHeight || medianBboxHeight);

      // Apply reference scale with normalization
      const dynamicScale = REFERENCE_SCALE * normalizationFactor;

      // Safety clamp to prevent extreme cases
      const finalScale = THREE.MathUtils.clamp(dynamicScale, 0.001, 0.015);

      console.log(`👤 Person ${idx}: BBox=${personBboxHeight.toFixed(0)}px, Norm=${normalizationFactor.toFixed(3)}, Scale=${finalScale.toFixed(6)}`);

      // ------------------------------------
      // BASE TRANSFORM WITH DYNAMIC SCALE
      // ------------------------------------
      let skeleton = kp.map(([x, y]) => [
        (x - hipCenter[0]) * finalScale,
        (footY - y) * finalScale,
        0
      ]);

      // ------------------------------------
      // POSITION ALL PLAYERS AT BATSMAN'S END
      // First player at center, others spread horizontally AND with depth
      // ------------------------------------
      if (idx === 0) {
        // Main batsman at center of batsman's end
        skeleton = skeleton.map(([x, y, z]) => [
          x,
          y,
          -CREASE_Z  // Batsman's end (striker position)
        ]);
      } else {
        // Other players positioned with both horizontal and depth spacing
        const side = idx % 2 === 0 ? 1 : -1;
        const spacing = Math.ceil(idx / 2);

        skeleton = skeleton.map(([x, y, z]) => [
          x + side * PLAYER_X_SPACING * spacing,  // Horizontal spacing
          y,
          -CREASE_Z - spacing * 0.6  // Depth spacing (slightly behind main batsman)
        ]);
      }

      framePersons.push(skeleton);
    });

    processed.push(framePersons);
  });

  return processed;
}



// --- ANIMATED SKELETON COMPONENT WITH INDEPENDENT ANIMATION ---
function AnimatedSkeleton({
  poseData,
  boneConnections,
  isPlaying,
  fps = 30,
  playbackSpeed = 1
}: {
  poseData: number[][][][],
  boneConnections: number[][],
  isPlaying: boolean,
  fps?: number,
  playbackSpeed?: number
}) {
  const groupRef = useRef<THREE.Group>(null);
  const frameIndexRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const totalFrames = poseData.length;

  // Independent animation loop with playback speed control
  useFrame((state) => {
    if (!isPlaying || totalFrames === 0) return;

    const currentTime = state.clock.getElapsedTime();
    // Apply playback speed: lower duration = faster playback
    const frameDuration = (1 / fps) / playbackSpeed;

    // Update frame based on elapsed time
    if (currentTime - lastUpdateTimeRef.current >= frameDuration) {
      frameIndexRef.current = (frameIndexRef.current + 1) % totalFrames;
      lastUpdateTimeRef.current = currentTime;
    }
  });

  if (totalFrames === 0) return null;

  const frameIndex = frameIndexRef.current;
  const framePersons = poseData[frameIndex];

  if (!framePersons || framePersons.length === 0) return null;

  // Colors for different persons
  const personColors = [
    { bone: "#facc15", joint: "#34d399" },  // Yellow bones, Green joints (person 1)
    { bone: "#60a5fa", joint: "#f472b6" },  // Blue bones, Pink joints (person 2)
    { bone: "#a78bfa", joint: "#fb923c" },  // Purple bones, Orange joints (person 3)
    { bone: "#4ade80", joint: "#f87171" },  // Green bones, Red joints (person 4)
  ];

  // Render all persons in the current frame
  return (
    <group ref={groupRef} >
      {framePersons.map((personKeypoints, personIdx) => {
        const jointPositions = personKeypoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const colors = personColors[personIdx % personColors.length];

        // Create the lines (bones) for this person
        const lines = boneConnections.map(([startIdx, endIdx], i) => {
          const start = jointPositions[startIdx];
          const end = jointPositions[endIdx];

          if (!start || !end) return null;

          return (
            <Line
              key={`person-${personIdx}-bone-${i}`}
              points={[start, end]}
              color={colors.bone}
              lineWidth={3}
              transparent
              opacity={0.8}
              depthTest={false}
            />
          );
        }).filter(Boolean);

        // Create the spheres (joints) for this person
        const joints = jointPositions.map((position, i) => (
          <mesh key={`person-${personIdx}-joint-${i}`} position={position}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshBasicMaterial color={colors.joint} />
          </mesh>
        ));

        return (
          <group key={`person-${personIdx}`}>
            {joints}
            {lines}
          </group>
        );
      })}
    </group>
  );
}

// --- CRICKET GROUND COMPONENT ---
function CricketGround() {
  return (
    <group position={[0, 0, 0]}>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2d5016" roughness={0.8} />
      </mesh>

      {/* Pitch (lighter brown) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[0.8, 3]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>

      {/* Crease Lines */}
      <Line
        points={[[-0.4, 0.02, -1.5], [0.4, 0.02, -1.5]]}
        color="white"
        lineWidth={2}
      />
      <Line
        points={[[-0.4, 0.02, 1.5], [0.4, 0.02, 1.5]]}
        color="white"
        lineWidth={2}
      />

      {/* Stumps at both ends */}
      {/* Bowler's end */}
      <group position={[0, 0, -1.5]}>
        <mesh position={[-0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
        <mesh position={[0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
      </group>

      {/* Batsman's end */}
      <group position={[0, 0, 1.5]}>
        <mesh position={[-0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
        <mesh position={[0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.7]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
      </group>

      {/* Boundary Circle (subtle) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[4.8, 5, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Loading fallback component for 3D canvas
function Loader3D() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#10b981" wireframe />
    </mesh>
  );
}

// --- MAIN 3D SKELETON VIEW COMPONENT ---
interface ThreeDSkeletonViewProps {
  keypointsData: PoseFrame[];
  isPlaying: boolean;
  fps?: number;
  playbackSpeed?: number;
}

export default function ThreeDSkeletonView({
  keypointsData,
  isPlaying,
  fps = 30,
  playbackSpeed = 1
}: ThreeDSkeletonViewProps) {
  const [skeletalData, setSkeletalData] = useState<number[][][][]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Process pose data when it changes
  useEffect(() => {
    if (keypointsData.length > 0) {
      const processed = process2DPoseData(keypointsData);
      setSkeletalData(processed);
    }
  }, [keypointsData]);

  // Track current frame for display with playback speed
  useEffect(() => {
    if (!isPlaying || skeletalData.length === 0) return;

    // Apply playback speed to interval
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % skeletalData.length);
    }, (1000 / fps) / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, skeletalData.length, fps, playbackSpeed]);

  if (keypointsData.length === 0) {
    return (
      <div className="w-full h-[65vh] flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-400 text-lg">No pose data available</p>
          <p className="text-slate-500 text-sm mt-2">Upload and process a video first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[65vh] relative bg-gradient-to-b from-sky-900 to-emerald-950">
      <Canvas shadows>
        <PerspectiveCamera
          makeDefault
          position={[4, 3, 6]}
          fov={50}
        />

        {/* Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 15, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color="#ffffff" />
        <spotLight
          position={[0, 12, 0]}
          angle={0.4}
          penumbra={1}
          intensity={0.8}
          castShadow
          color="#ffffff"
        />
        <hemisphereLight
          color="#87ceeb"
          groundColor="#2d5016"
          intensity={0.5}
        />

        <Environment preset="sunset" />

        {/* Cricket Ground */}
        <Suspense fallback={null}>
          <CricketGround />
        </Suspense>

        {/* 3D Skeletal Animation */}
        <Suspense fallback={<Loader3D />}>
          {skeletalData.length > 0 && (
            <AnimatedSkeleton
              poseData={skeletalData}
              boneConnections={COCO_BONES}
              isPlaying={isPlaying}
              fps={fps}
              playbackSpeed={playbackSpeed}
            />
          )}
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
          maxPolarAngle={Math.PI / 1.8}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1, 0]}
        />
      </Canvas>

      {/* Playback Info Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-lg p-3 border border-slate-700">
        <p className="text-emerald-400 text-xs sm:text-sm font-medium mb-1">
          🎯 3D Cricket Ground View
        </p>
        <p className="text-slate-400 text-[10px] sm:text-xs">
          Frame: {currentFrame + 1} / {skeletalData.length}
        </p>
        <p className="text-slate-400 text-[10px] sm:text-xs">
          {isPlaying ? '▶ Playing' : '⏸ Paused'} • {fps} FPS • {playbackSpeed}x speed
        </p>
        <p className="text-slate-400 text-[10px] sm:text-xs">
          Mouse: Rotate • Scroll: Zoom • Right-click: Pan
        </p>
      </div>
    </div>
  );
}
