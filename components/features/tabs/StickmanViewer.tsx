"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ReplayData, Frame, JointName } from '@/types/replayTypes';

// ==========================================
// 1. HELPER: The "Limb" Component
// Creates a solid cylinder between two 3D points
// ==========================================
interface LimbProps {
    start: [number, number, number];
    end: [number, number, number];
    color?: string;
    thickness?: number;
}

const Limb = ({ start, end, color = "#2f3e46", thickness = 0.12 }: LimbProps) => {
    const { position, rotation, length } = useMemo(() => {
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);

        // Midpoint
        const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
        // Length
        const dist = startVec.distanceTo(endVec);

        // Rotation (lookAt trick)
        const obj = new THREE.Object3D();
        obj.position.copy(startVec);
        obj.lookAt(endVec);
        obj.rotateX(Math.PI / 2); // Align cylinder to Z-axis of lookAt

        return { position: midPoint, rotation: obj.rotation, length: dist };
    }, [start, end]);

    return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
            <cylinderGeometry args={[thickness, thickness, length, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
    );
};

// ==========================================
// 2. HELPER: Math Utilities
// ==========================================
const getMidpoint = (p1: number[], p2: number[]): [number, number, number] => {
    return [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2,
        (p1[2] + p2[2]) / 2
    ];
};

// ==========================================
// 3. COMPONENT: The Robot Character
// ==========================================
const Character = ({ frameData }: { frameData: Frame }) => {
    const { joints } = frameData;

    // Helper to get raw coordinates safely
    const get = (name: JointName) => joints[name];

    // Calculate "Virtual" Joints for the Spine
    // We need the center of shoulders and center of hips to draw a body
    const midShoulder = (get('left_shoulder') && get('right_shoulder'))
        ? getMidpoint(get('left_shoulder'), get('right_shoulder'))
        : null;

    const midHip = (get('left_hip') && get('right_hip'))
        ? getMidpoint(get('left_hip'), get('right_hip'))
        : null;

    return (
        <group>
            {/* --- HEAD --- */}
            {joints.nose && (
                <mesh position={new THREE.Vector3(joints.nose[0], joints.nose[1], joints.nose[2])} castShadow>
                    <boxGeometry args={[0.25, 0.3, 0.25]} />
                    <meshStandardMaterial color="#fca311" /> {/* Gold Head */}
                </mesh>
            )}

            {/* --- TORSO (The Spine) --- */}
            {midShoulder && midHip && (
                <Limb start={midShoulder} end={midHip} thickness={0.25} color="#14213d" />
            )}

            {/* --- ARMS --- */}
            {get('left_shoulder') && get('left_elbow') && (
                <Limb start={get('left_shoulder')} end={get('left_elbow')} />
            )}
            {get('left_elbow') && get('left_wrist') && (
                <Limb start={get('left_elbow')} end={get('left_wrist')} thickness={0.09} />
            )}

            {get('right_shoulder') && get('right_elbow') && (
                <Limb start={get('right_shoulder')} end={get('right_elbow')} />
            )}
            {get('right_elbow') && get('right_wrist') && (
                <Limb start={get('right_elbow')} end={get('right_wrist')} thickness={0.09} />
            )}

            {/* --- LEGS --- */}
            {get('left_hip') && get('left_knee') && (
                <Limb start={get('left_hip')} end={get('left_knee')} thickness={0.16} />
            )}
            {get('left_knee') && get('left_ankle') && (
                <Limb start={get('left_knee')} end={get('left_ankle')} thickness={0.12} />
            )}

            {get('right_hip') && get('right_knee') && (
                <Limb start={get('right_hip')} end={get('right_knee')} thickness={0.16} />
            )}
            {get('right_knee') && get('right_ankle') && (
                <Limb start={get('right_knee')} end={get('right_ankle')} thickness={0.12} />
            )}

            {/* --- SHOULDERS & HIPS (Connectors) --- */}
            {get('left_shoulder') && get('right_shoulder') && (
                <Limb start={get('left_shoulder')} end={get('right_shoulder')} thickness={0.15} />
            )}
            {get('left_hip') && get('right_hip') && (
                <Limb start={get('left_hip')} end={get('right_hip')} thickness={0.18} />
            )}
        </group>
    );
};

// ==========================================
// 4. LOGIC: Animation Loop
// ==========================================
const AnimationLoop = ({
    data,
    onUpdate
}: {
    data: ReplayData;
    onUpdate: (idx: number) => void
}) => {
    const [index, setIndex] = useState(0);
    const timeAccumulator = useRef(0);

    // Calculate time per frame (e.g., 30fps = 0.033s)
    const frameDuration = 1 / (data.fps || 30);

    useFrame((state, delta) => {
        timeAccumulator.current += delta;

        // If enough time has passed, move to next frame
        if (timeAccumulator.current >= frameDuration) {
            setIndex((prev) => {
                const next = (prev + 1) % data.frames.length;
                onUpdate(next);
                return next;
            });
            // Reset timer
            timeAccumulator.current = 0;
        }
    });

    return null;
};

// ==========================================
// 5. MAIN COMPONENT: StickmanViewer
// ==========================================
interface ViewerProps {
    dataUrl: string;
}

export default function StickmanViewer({ dataUrl }: ViewerProps) {
    const [replayData, setReplayData] = useState<ReplayData | null>(null);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

    useEffect(() => {
        const fetchReplay = async () => {
            try {
                const res = await fetch(dataUrl);
                const data = await res.json();
                setReplayData(data);
            } catch (e) {
                console.error("Error loading replay:", e);
            }
        };
        fetchReplay();
    }, [dataUrl]);

    return (
        <div className="w-full h-[600px] bg-gray-900 rounded-xl overflow-hidden shadow-2xl relative">

            {/* Loading Screen */}
            {!replayData && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
                        <p>Processing Match Data...</p>
                    </div>
                </div>
            )}

            <Canvas shadows camera={{ position: [2, 2, 5], fov: 45 }}>
                {/* --- LIGHTING --- */}
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-5, 5, 5]} intensity={0.5} color="#ffffff" />

                {/* --- ENVIRONMENT --- */}
                <Grid
                    position={[0, 0, 0]}
                    args={[20, 20]}
                    cellColor="#4a5568"
                    sectionColor="#cbd5e0"
                    fadeDistance={15}
                />
                <OrbitControls makeDefault minDistance={2} maxDistance={15} />

                {/* --- THE ROBOT --- */}
                {replayData && (
                    <>
                        <Character frameData={replayData.frames[currentFrameIndex]} />

                        <AnimationLoop
                            data={replayData}
                            onUpdate={setCurrentFrameIndex}
                        />
                    </>
                )}
            </Canvas>

            {/* --- UI OVERLAY --- */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10 flex flex-col gap-1">
                <span className="text-xs text-gray-400 font-mono">REPLAY MODE</span>
                <span className="font-bold">
                    Frame: {currentFrameIndex} / {replayData?.frames.length || 0}
                </span>
            </div>
        </div>
    );
}