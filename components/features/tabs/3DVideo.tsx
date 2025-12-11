"use client";

import { Suspense, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
// Import Line for drawing the skeleton bones
import { OrbitControls, useGLTF, Environment, PerspectiveCamera, Line } from "@react-three/drei";
import { Button } from "@/components/ui/Button";
import * as THREE from "three";
import JOE_ROOT_POSE_DATA from '@/public/JOE_ROOT_BATTING_MASTERCLASS_keypoints_1.json';

// --- TypeScript Interfaces for the JSON Data Structure ---
interface Keypoint {
  keypoints: [number, number][]; // Array of [x, y] tuples
  scores: number[];
  person_id: number;
  bbox: number[];
  mean_confidence: number;
}

interface FrameData {
  frame_number: number;
  num_persons: number;
  persons: Keypoint[];
}

// Define the expected structure of the props
interface ThreeDVideoProps {
  initialPoseData: FrameData[];
}

// --- 1. KEYPOINT TOPOLOGY (COCO 17-point) ---
// Connections (Bones) based on 0-indexing for COCO 17 joints:
// [0:Nose, 1:L-Eye, 2:R-Eye, 3:L-Ear, 4:R-Ear, 5:L-Shoulder, 6:R-Shoulder, 7:L-Elbow, 8:R-Elbow, 9:L-Wrist, 10:R-Wrist, 11:L-Hip, 12:R-Hip, 13:L-Knee, 14:R-Knee, 15:L-Ankle, 16:R-Ankle]
const COCO_BONES = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head/Face
  [5, 6], [5, 11], [6, 12], [11, 12], // Torso/Hips
  [6, 8], [8, 10], // Right Arm (Shoulder-Elbow-Wrist)
  [5, 7], [7, 9], // Left Arm (Shoulder-Elbow-Wrist)
  [12, 14], [14, 16], // Right Leg (Hip-Knee-Ankle)
  [11, 13], [13, 15] // Left Leg (Hip-Knee-Ankle)
];

// --- 2. DATA PROCESSING FUNCTION (Simulated 2D-to-3D Lifting) ---
/**
 * Processes 2D keypoint data into normalized 3D coordinates for animation.
 */
function process2DPoseData() {
  if (!JOE_ROOT_POSE_DATA || JOE_ROOT_POSE_DATA.length === 0) return [];

  const processedData: number[][][] = [];
  let maxY = -Infinity;
  let minY = Infinity;

  // Find the overall vertical bounds
  JOE_ROOT_POSE_DATA.forEach(frame => {
    frame.persons.forEach(person => {
      person.keypoints.forEach(kp => {
        const y = kp[1];
        if (y > maxY) maxY = y;
        if (y < minY) minY = y;
      });
    });
  });

  const height = maxY - minY;
  // Adjust these factors to control the scene's scale and pseudo-depth effect
  const scaleFactor = 0.01;
  const depthFactor = 0.5;

  JOE_ROOT_POSE_DATA.forEach(frame => {
    if (frame.persons.length > 0) {
      const person = frame.persons[0];
      const keypoints3D: number[][] = person.keypoints.map(kp => {
        const x = kp[0] * scaleFactor;
        // Invert Y axis for world space (top of screen = +Y, bottom = -Y or 0)
        const y = (maxY - kp[1]) * scaleFactor;

        // Simple 2D-to-3D lift approximation: depth (Z) based on screen Y
        const normalizedY = (kp[1] - minY) / height;
        // Z is slightly negative (into the screen) for joints closer to the camera (lower Y/closer to ground)
        const z = -(1 - normalizedY) * depthFactor;

        // Return coordinates as [x, y, z]
        return [x, y, z];
      });
      processedData.push(keypoints3D);
    }
  });

  // Center all points horizontally (X-axis) using the average hip midpoint
  if (processedData.length > 0) {
    // Indices 11 (Left Hip) and 12 (Right Hip) for COCO
    const hipMidPointsX = processedData.map(frame => {
      const lh = frame[11] ? frame[11][0] : 0;
      const rh = frame[12] ? frame[12][0] : 0;
      // Use a default value if hips aren't perfectly detected
      const count = (frame[11] ? 1 : 0) + (frame[12] ? 1 : 0);
      return count > 0 ? (lh + rh) / count : 0;
    });

    const avgHipMidX = hipMidPointsX.reduce((sum, x) => sum + x, 0) / hipMidPointsX.length;

    for (const frame of processedData) {
      for (const kp of frame) {
        kp[0] -= avgHipMidX; // Apply offset
      }
    }
  }

  return processedData;
}


// --- 3. ANIMATED SKELETON COMPONENT (Custom R3F Element) ---
// Renders the 3D points and lines and handles the animation loop
function AnimatedSkeleton({ poseData, boneConnections }: { poseData: number[][][], boneConnections: number[][] }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const totalFrames = poseData.length;

  useFrame(() => {
    // Control animation speed (e.g., advance every 1 frame for ~60FPS animation)
    if (totalFrames > 0) {
      setFrameIndex((prevIndex) => (prevIndex + 1) % totalFrames);
    }
  });

  if (totalFrames === 0 || !poseData[frameIndex]) return null;

  const currentFrame = poseData[frameIndex];

  // Convert raw 3D array points to THREE.Vector3 objects
  const jointPositions = currentFrame.map(p => new THREE.Vector3(p[0], p[1], p[2]));

  // Create the lines (bones)
  const lines = boneConnections.map(([startIdx, endIdx], i) => {
    const start = jointPositions[startIdx];
    const end = jointPositions[endIdx];

    // Safety check for valid indices (in case topology or detection fails)
    if (!start || !end) return null;

    return (
      <Line
        key={`bone-${i}`}
        points={[start, end]}
        color="#facc15" // Yellow/Gold for visibility
        lineWidth={3}
        // Material props for depth handling
        transparent
        opacity={0.8}
        // Depth-related rendering hint
        depthTest={false}
      />
    );
  }).filter(Boolean);

  // Create the spheres (joints)
  const joints = jointPositions.map((position, i) => (
    <mesh key={`joint-${i}`} position={position}>
      <sphereGeometry args={[0.04, 8, 8]} /> {/* Joint size */}
      <meshBasicMaterial color="#34d399" /> // Green for joints
    </mesh>
  ));

  // 

  return (
    <group position={[0, 0.5, 0]}> {/* Lift skeleton slightly off the ground plane */}
      {joints}
      {lines}
    </group>
  );
}


// --- 4. GLB Model Loader Component (Original, converted to TS) ---
function Model({ url }: { url: string }) {
  const modelRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={scene}
      scale={1}
      position={[0, 0, 0]}
    />
  );
}

// Loading fallback component
function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#10b981" wireframe />
    </mesh>
  );
}


// --- 5. MAIN COMPONENT (Updated with Data Loading and State) ---
export default function ThreeDVideo() {
  // Process the raw 2D data into a 3D animation array only once
  const skeletalData = useMemo(() => process2DPoseData(), []);

  const [glbModelUrl, setGlbModelUrl] = useState<string>("/models/sample.glb");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default view mode to skeletal animation
  const [viewMode, setViewMode] = useState<'glb' | 'skeletal'>('skeletal');

  // Logic to handle GLB file upload (unchanged)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith(".glb")) {
      const url = URL.createObjectURL(file);
      setIsLoading(true);
      setGlbModelUrl(url);
      setViewMode('glb');
      setTimeout(() => setIsLoading(false), 1000);
    } else {
      alert("Please upload a valid .glb file");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-400 mb-3">
          {viewMode === 'skeletal' ? "3D Pose Animation Viewer" : "3D GLB Model Viewer"}
        </h2>
        <p className="text-gray-400 text-sm">
          {viewMode === 'skeletal'
            ? `Viewing skeletal animation (${skeletalData.length} frames) derived from 2D keypoints.`
            : "View and interact with 3D cricket models."
          }
        </p>
      </div>

      {/* Mode Switcher Buttons */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
        <Button
          onClick={() => setViewMode('skeletal')}
          variant={viewMode === 'skeletal' ? 'primary' : 'secondary'}
          className={viewMode === 'skeletal' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
        >
          View Skeletal Animation
        </Button>

        <Button
          onClick={() => setViewMode('glb')}
          variant={viewMode === 'glb' ? 'primary' : 'secondary'}
          className={viewMode === 'glb' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
        >
          View GLB Model
        </Button>

        {/* File Upload for GLB Mode */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="secondary"
          disabled={viewMode === 'skeletal'}
          className={`${viewMode === 'skeletal' ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
        >
          Upload New GLB File
        </Button>
      </div>

      {/* 3D Canvas */}
      <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl overflow-hidden">
        <div className="w-full h-[600px] relative">
          <Canvas shadows>
            {/* Camera: Adjusted position for a better skeletal view */}
            <PerspectiveCamera
              makeDefault
              position={viewMode === 'skeletal' ? [2, 1, 3] : [5, 3, 5]}
              fov={75}
            />

            {/* Lights */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[-10, -10, -5]} intensity={0.5} />
            <spotLight
              position={[0, 10, 0]}
              angle={0.3}
              penumbra={1}
              intensity={0.5}
              castShadow
            />

            {/* Environment for realistic reflections */}
            <Environment preset="sunset" />

            {/* 3D Content */}
            <Suspense fallback={<Loader />}>
              {viewMode === 'glb' && glbModelUrl && <Model url={glbModelUrl} />}

              {viewMode === 'skeletal' && skeletalData.length > 0 && (
                <AnimatedSkeleton
                  poseData={skeletalData}
                  boneConnections={COCO_BONES}
                />
              )}
              {viewMode === 'skeletal' && skeletalData.length === 0 && (
                // Fallback for when data is loading or empty
                <mesh>
                  <boxGeometry args={[0.05, 0.05, 0.05]} />
                  <meshBasicMaterial color="red" />
                </mesh>
              )}
            </Suspense>

            {/* Grid Helper - centered at the origin */}
            <gridHelper args={[5, 10, "#1f2937", "#374151"]} />

            {/* Orbit Controls for mouse interaction */}
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minDistance={2}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0f1f3a]/80 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                <p className="text-emerald-400">Loading 3D Model...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Info (unchanged) */}
        <div className="bg-[#0a1628] p-4 border-t border-gray-800">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-emerald-400">
                🖱️
              </div>
              <span className="text-gray-400">Left Click + Drag to Rotate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-emerald-400">
                🖱️
              </div>
              <span className="text-gray-400">Right Click + Drag to Pan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-emerald-400">
                🖱️
              </div>
              <span className="text-gray-400">Scroll to Zoom</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}