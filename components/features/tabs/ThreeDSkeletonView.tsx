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

// --- 3D POSE DATA PROCESSING ---
function process2DPoseData(rawData: PoseFrame[]): number[][][][] {
  if (!rawData || rawData.length === 0) return [];

  const processedData: number[][][][] = [];
  let maxY = -Infinity;
  let minY = Infinity;

  // Find the overall vertical bounds across ALL persons
  rawData.forEach(frame => {
    if (frame.persons && frame.persons.length > 0) {
      frame.persons.forEach(person => {
        person.keypoints.forEach(kp => {
          const y = kp[1];
          if (y > maxY) maxY = y;
          if (y < minY) minY = y;
        });
      });
    }
  });

  const height = maxY - minY;
  const scaleFactor = 0.0018; // Reduced from 0.003 to make skeleton smaller and fit on pitch
  const depthFactor = 0.15; // Reduced depth for better proportions

  rawData.forEach(frame => {
    const framePersons: number[][][] = [];

    if (frame.persons && frame.persons.length > 0) {
      // Process ALL persons in this frame
      frame.persons.forEach(person => {
        const keypoints3D: number[][] = person.keypoints.map(kp => {
          const x = kp[0] * scaleFactor;
          const y = (maxY - kp[1]) * scaleFactor;
          const normalizedY = (kp[1] - minY) / height;
          const z = -(1 - normalizedY) * depthFactor;
          return [x, y, z];
        });
        framePersons.push(keypoints3D);
      });
    }

    processedData.push(framePersons);
  });

  // Center all points horizontally (X-axis) using the average hip midpoint across ALL persons
  if (processedData.length > 0) {
    const allHipMidPointsX: number[] = [];

    processedData.forEach(framePersons => {
      framePersons.forEach(personKeypoints => {
        const lh = personKeypoints[11] ? personKeypoints[11][0] : 0;
        const rh = personKeypoints[12] ? personKeypoints[12][0] : 0;
        const count = (personKeypoints[11] ? 1 : 0) + (personKeypoints[12] ? 1 : 0);
        if (count > 0) {
          allHipMidPointsX.push((lh + rh) / count);
        }
      });
    });

    const avgHipMidX = allHipMidPointsX.length > 0
      ? allHipMidPointsX.reduce((sum, x) => sum + x, 0) / allHipMidPointsX.length
      : 0;

    for (const framePersons of processedData) {
      for (const personKeypoints of framePersons) {
        for (const kp of personKeypoints) {
          kp[0] -= avgHipMidX;
        }
      }
    }
  }

  return processedData;
}

// --- ANIMATED SKELETON COMPONENT WITH INDEPENDENT ANIMATION ---
function AnimatedSkeleton({
  poseData,
  boneConnections,
  isPlaying,
  fps = 30
}: {
  poseData: number[][][][],
  boneConnections: number[][],
  isPlaying: boolean,
  fps?: number
}) {
  const groupRef = useRef<THREE.Group>(null);
  const frameIndexRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const totalFrames = poseData.length;

  // Independent animation loop
  useFrame((state) => {
    if (!isPlaying || totalFrames === 0) return;

    const currentTime = state.clock.getElapsedTime();
    const frameDuration = 1 / fps;

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
    <group ref={groupRef} position={[0, 0, -1.2]}>
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
}

export default function ThreeDSkeletonView({
  keypointsData,
  isPlaying,
  fps = 30
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

  // Track current frame for display (independent of video)
  useEffect(() => {
    if (!isPlaying || skeletalData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % skeletalData.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, skeletalData.length, fps]);

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
          {isPlaying ? '▶ Playing' : '⏸ Paused'} • {fps} FPS
        </p>
        <p className="text-slate-400 text-[10px] sm:text-xs">
          Mouse: Rotate • Scroll: Zoom • Right-click: Pan
        </p>
      </div>
    </div>
  );
}
