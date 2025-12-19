"use client";

import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line, Environment } from "@react-three/drei";
import * as THREE from "three";

// MediaPipe Pose connections (33 landmarks)
const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
    [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
];

const HUMAN_SCALE = 1.8;
const HUMAN_Y_OFFSET = 0;
const DEPTH_SCALE = 0.5;

interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

interface MediaPipePoseFrame {
    landmarks?: Landmark[];
    timestamp?: number;
    confidence?: number;
    frameIndex?: number;
}

interface MediaPipe3DViewProps {
    poseData: MediaPipePoseFrame[];
    isProcessing: boolean;
    processingProgress: number;
    error: string;
    isPlaying: boolean;
    playbackSpeed: number;
}

const getLandmarkBasePosition = (landmark: Landmark): THREE.Vector3 => {
    return new THREE.Vector3(
        (landmark.x - 0.5) * HUMAN_SCALE,
        (1 - landmark.y) * HUMAN_SCALE + HUMAN_Y_OFFSET,
        -landmark.z * DEPTH_SCALE
    );
};

function AnimatedSkeleton({
    poseData,
    currentFrame,
    showSkeleton,
    showBodyParts,
    showBat,
    showHelmet
}: {
    poseData: MediaPipePoseFrame[];
    currentFrame: number;
    showSkeleton: boolean;
    showBodyParts: boolean;
    showBat: boolean;
    showHelmet: boolean;
}) {
    if (!poseData || poseData.length === 0) return null;

    const frame = poseData[currentFrame];
    const landmarks = frame?.landmarks;

    if (!landmarks || landmarks.length === 0) return null;

    const positions = landmarks.map(landmark => getLandmarkBasePosition(landmark));

    // Joints
    const joints = positions.map((position, i) => {
        const landmark = landmarks[i];
        const isVisible = landmark.visibility === undefined || landmark.visibility >= 0.1;

        if (!isVisible) return null;

        let jointRadius = 0.03;
        if (i === 0) jointRadius = 0.06;
        else if ([11, 12, 23, 24].includes(i)) jointRadius = 0.04;

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

    // Bones
    const bones = POSE_CONNECTIONS.map(([start, end], i) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        const startVisible = startLandmark?.visibility === undefined || startLandmark?.visibility >= 0.1;
        const endVisible = endLandmark?.visibility === undefined || endLandmark?.visibility >= 0.1;

        if (!startVisible || !endVisible || !showSkeleton) return null;

        return (
            <Line
                key={`bone-${i}`}
                points={[positions[start], positions[end]]}
                color="#00aaff"
                lineWidth={3}
                transparent
                opacity={0.95}
            />
        );
    }).filter(Boolean);

    // Body parts helper
    const createBodyPart = (startIdx: number, endIdx: number, radius: number, color: number, key: string) => {
        const startLandmark = landmarks[startIdx];
        const endLandmark = landmarks[endIdx];
        const startVisible = startLandmark?.visibility === undefined || startLandmark?.visibility >= 0.1;
        const endVisible = endLandmark?.visibility === undefined || endLandmark?.visibility >= 0.1;

        if (!startVisible || !endVisible || !showBodyParts) return null;

        const startPos = positions[startIdx];
        const endPos = positions[endIdx];
        const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const distance = startPos.distanceTo(endPos);
        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);

        return (
            <mesh key={key} position={midpoint} quaternion={quaternion}>
                <capsuleGeometry args={[radius, distance * 0.8, 8, 16]} />
                <meshPhongMaterial color={color} shininess={10} />
            </mesh>
        );
    };

    const bodyParts = showBodyParts && (
        <group>
            {landmarks[0] && (landmarks[0].visibility ?? 0) >= 0.1 && (
                <mesh position={positions[0]}>
                    <sphereGeometry args={[0.11, 32, 32]} />
                    <meshPhongMaterial color={0xFFDBB3} shininess={20} />
                </mesh>
            )}

            {showHelmet && landmarks[0] && (landmarks[0].visibility ?? 0) >= 0.1 && (
                <group position={[positions[0].x, positions[0].y + 0.02, positions[0].z]}>
                    <mesh rotation={[Math.PI, 0, 0]}>
                        <sphereGeometry args={[0.13, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                        <meshPhongMaterial color={0x1a1a1a} shininess={50} />
                    </mesh>
                    <mesh position={[0, -0.02, 0.12]}>
                        <boxGeometry args={[0.14, 0.12, 0.02]} />
                        <meshPhongMaterial color={0x333333} transparent opacity={0.7} shininess={80} />
                    </mesh>
                </group>
            )}

            {landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24] && (() => {
                const shoulderCenter = new THREE.Vector3().addVectors(positions[11], positions[12]).multiplyScalar(0.5);
                const hipCenter = new THREE.Vector3().addVectors(positions[23], positions[24]).multiplyScalar(0.5);
                const torsoCenter = new THREE.Vector3().addVectors(shoulderCenter, hipCenter).multiplyScalar(0.5);
                const direction = new THREE.Vector3().subVectors(shoulderCenter, hipCenter).normalize();
                const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                const height = shoulderCenter.distanceTo(hipCenter);

                return (
                    <mesh position={torsoCenter} quaternion={quaternion}>
                        <capsuleGeometry args={[0.15, height * 0.8, 8, 16]} />
                        <meshPhongMaterial color={0xFFFFFF} shininess={10} />
                    </mesh>
                );
            })()}

            {createBodyPart(11, 13, 0.05, 0xFFFFFF, 'left-upper-arm')}
            {createBodyPart(12, 14, 0.05, 0xFFFFFF, 'right-upper-arm')}
            {createBodyPart(13, 15, 0.04, 0xFFDBB3, 'left-forearm')}
            {createBodyPart(14, 16, 0.04, 0xFFDBB3, 'right-forearm')}
            {createBodyPart(23, 25, 0.08, 0xFFFFFF, 'left-thigh')}
            {createBodyPart(24, 26, 0.08, 0xFFFFFF, 'right-thigh')}
            {createBodyPart(25, 27, 0.06, 0xF0F0F0, 'left-shin')}
            {createBodyPart(26, 28, 0.06, 0xF0F0F0, 'right-shin')}

            {[15, 16].map(idx => landmarks[idx] && (landmarks[idx].visibility ?? 0) >= 0.1 && (
                <mesh key={`hand-${idx}`} position={positions[idx]}>
                    <sphereGeometry args={[0.06, 12, 12]} />
                    <meshPhongMaterial color={0xF5F5DC} shininess={5} />
                </mesh>
            ))}

            {[27, 28].map(idx => landmarks[idx] && (landmarks[idx].visibility ?? 0) >= 0.1 && (
                <mesh key={`foot-${idx}`} position={positions[idx]}>
                    <boxGeometry args={[0.08, 0.06, 0.12]} />
                    <meshPhongMaterial color={0xFFFFFF} shininess={30} />
                </mesh>
            ))}
        </group>
    );

    const cricketBat = showBat && landmarks[15] && landmarks[16] && (() => {
        const leftVisible = (landmarks[15].visibility ?? 0) >= 0.1;
        const rightVisible = (landmarks[16].visibility ?? 0) >= 0.1;

        if (!leftVisible && !rightVisible) return null;

        let batPosition: THREE.Vector3;
        if (leftVisible && rightVisible) {
            batPosition = positions[16].clone().multiplyScalar(0.7).add(positions[15].clone().multiplyScalar(0.3));
            batPosition.y -= 0.1;
        } else {
            batPosition = (leftVisible ? positions[15] : positions[16]).clone();
            batPosition.y -= 0.12;
        }

        return (
            <group position={batPosition} rotation={[-Math.PI / 6, 0, 0]}>
                <mesh position={[0, -0.43, 0]}>
                    <boxGeometry args={[0.108, 0.86, 0.04]} />
                    <meshPhongMaterial color={0xD4A574} shininess={15} />
                </mesh>
                <mesh position={[0, -0.3, 0.021]}>
                    <planeGeometry args={[0.09, 0.15]} />
                    <meshBasicMaterial color={0xA0826D} transparent opacity={0.3} />
                </mesh>
                <mesh position={[0, 0.265, 0]}>
                    <cylinderGeometry args={[0.018, 0.025, 0.33, 12]} />
                    <meshPhongMaterial color={0x8B4513} shininess={10} />
                </mesh>
            </group>
        );
    })();

    return (
        <group>
            {/* Cricket pitch */}
            <group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[30, 30]} />
                    <meshLambertMaterial color={0x2d5016} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.01, 0]} receiveShadow castShadow>
                    <boxGeometry args={[1.5, 0.02, 22]} />
                    <meshLambertMaterial color={0x8B7355} />
                </mesh>
                <mesh position={[0, 0.02, -2]}>
                    <boxGeometry args={[1.5, 0.03, 0.05]} />
                    <meshLambertMaterial color={0xffffff} />
                </mesh>
                <mesh position={[0, 0.02, 0.78]}>
                    <boxGeometry args={[1.5, 0.03, 0.05]} />
                    <meshLambertMaterial color={0xffffff} />
                </mesh>
            </group>
            {joints}
            {bones}
            {bodyParts}
            {/* {cricketBat} */}
        </group>
    );
}

export default function MediaPipe3DView({ poseData, isProcessing, processingProgress, error, isPlaying, playbackSpeed }: MediaPipe3DViewProps) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [showBodyParts, setShowBodyParts] = useState(true);
    const [showBat, setShowBat] = useState(true);
    const [showHelmet, setShowHelmet] = useState(true);

    // Playback control
    useEffect(() => {
        if (!isPlaying || poseData.length === 0) return;

        const fps = 25;
        const interval = (1000 / fps) / playbackSpeed;

        const playbackInterval = setInterval(() => {
            setCurrentFrame(prev => {
                if (prev >= poseData.length - 1) return 0;
                return prev + 1;
            });
        }, interval);

        return () => clearInterval(playbackInterval);
    }, [isPlaying, playbackSpeed, poseData.length]);

    return (
        <div className="w-full h-[65vh] relative bg-slate-950">
            {isProcessing ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/95">
                    <div className="text-center max-w-md px-4">
                        <div className="mb-4">
                            <svg className="animate-spin h-12 w-12 mx-auto text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <p className="text-emerald-400 text-lg font-semibold mb-2">Processing with MediaPipe AI...</p>
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                            <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${processingProgress}%` }}
                            />
                        </div>
                        <p className="text-slate-400 text-sm">{processingProgress}%</p>
                        <p className="text-slate-500 text-xs mt-2">Processing in background... You can switch tabs anytime!</p>
                    </div>
                </div>
            ) : error ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center max-w-md px-4">
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <p className="text-red-400 text-lg font-semibold mb-2">Processing Error</p>
                        <p className="text-slate-400 text-sm">{error}</p>
                    </div>
                </div>
            ) : poseData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                        <p className="text-slate-400 text-lg">Upload a video to see 3D analysis</p>
                        <p className="text-slate-500 text-sm mt-2">Processing starts automatically after upload</p>
                    </div>
                </div>
            ) : (
                <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[4, 1.2, -2]} fov={50} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
                    <directionalLight position={[-5, 8, -5]} intensity={0.4} color={0x88ccff} />
                    <gridHelper args={[30, 30, "#1f2937", "#374151"]} />
                    <Environment preset="sunset" />

                    <Suspense fallback={null}>
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
                        enableDamping
                        dampingFactor={0.05}
                        target={[0, 0.9, -2]}
                        minDistance={2}
                        maxDistance={20}
                        maxPolarAngle={Math.PI / 2}
                    />
                </Canvas>
            )}

            {/* Frame scrubber bar at top */}
            {poseData.length > 0 && !isProcessing && (
                <div className="absolute top-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-b border-slate-700 p-3 z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                            {currentFrame + 1} / {poseData.length}
                        </span>
                        <input
                            type="range"
                            min="0"
                            max={poseData.length - 1}
                            value={currentFrame}
                            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
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
                                background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${(currentFrame / (poseData.length - 1)) * 100}%, rgb(51 65 85) ${(currentFrame / (poseData.length - 1)) * 100}%, rgb(51 65 85) 100%)`
                            }}
                        />
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
                                disabled={currentFrame === 0}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded text-xs transition-colors"
                                title="Previous frame"
                            >
                                ◀
                            </button>
                            <button
                                onClick={() => setCurrentFrame(prev => Math.min(poseData.length - 1, prev + 1))}
                                disabled={currentFrame === poseData.length - 1}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded text-xs transition-colors"
                                title="Next frame"
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Display options overlay */}
            {poseData.length > 0 && !isProcessing && (
                <>
                    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-slate-400 font-semibold mb-2">Display Options</p>
                        {[
                            { label: 'Skeleton', state: showSkeleton, setState: setShowSkeleton },
                            { label: 'Body Parts', state: showBodyParts, setState: setShowBodyParts },
                            // { label: 'Cricket Bat', state: showBat, setState: setShowBat },
                            { label: 'Helmet', state: showHelmet, setState: setShowHelmet }
                        ].map(({ label, state, setState }) => (
                            <label key={label} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-emerald-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={state}
                                    onChange={(e) => setState(e.target.checked)}
                                    className="w-3 h-3 text-emerald-600 bg-slate-800 border-slate-600 rounded"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 space-y-1">
                        <p className="text-xs text-emerald-400 font-semibold">MediaPipe AI</p>
                        <p className="text-xs text-slate-400">
                            {isPlaying ? '▶ Playing' : '⏸ Paused'}
                        </p>
                        <p className="text-xs text-slate-500">
                            Speed: {playbackSpeed}x
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                            {poseData.filter(f => f.landmarks && f.landmarks.length > 0).length} poses
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
