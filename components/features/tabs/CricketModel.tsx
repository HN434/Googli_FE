// components/AnimatedModelViewer.tsx
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment, Sky } from '@react-three/drei';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Group } from 'three';

/**
 * Stadium Component - Creates a circular stadium with stands
 */
function Stadium() {
    return (
        <group>
            {/* Stadium Bowl - Circular stands */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[35, 38, 8, 32, 1, true]} />
                <meshStandardMaterial color="#2c3e50" side={THREE.DoubleSide} />
            </mesh>

            {/* Stadium Seating Tiers */}
            {[0, 1, 2, 3].map((tier) => (
                <mesh key={tier} position={[0, 2 + tier * 1.5, 0]}>
                    <cylinderGeometry args={[34 - tier * 0.5, 34.5 - tier * 0.5, 1, 32, 1, true]} />
                    <meshStandardMaterial
                        color={tier % 2 === 0 ? "#34495e" : "#2c3e50"}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}

            {/* Stadium Lights - 4 Light Towers */}
            {[0, 90, 180, 270].map((angle) => {
                const x = Math.cos((angle * Math.PI) / 180) * 40;
                const z = Math.sin((angle * Math.PI) / 180) * 40;
                return (
                    <group key={angle} position={[x, 0, z]}>
                        {/* Light Tower */}
                        <mesh position={[0, 12, 0]}>
                            <cylinderGeometry args={[0.3, 0.5, 24, 8]} />
                            <meshStandardMaterial color="#7f8c8d" metalness={0.8} />
                        </mesh>
                        {/* Light Fixture */}
                        <mesh position={[0, 24, 0]}>
                            <boxGeometry args={[2, 1, 2]} />
                            <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.5} />
                        </mesh>
                        {/* Actual Light */}
                        <spotLight
                            position={[0, 24, 0]}
                            angle={0.6}
                            penumbra={0.5}
                            intensity={1}
                            castShadow
                            target-position={[0, 0, 0]}
                        />
                    </group>
                );
            })}
        </group>
    );
}

/**
 * Cricket Pitch Component - Creates a realistic pitch with crease lines
 */
function CricketPitch() {
    return (
        <group position={[0, 0.01, 0]}>
            {/* Main Pitch Strip */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[3, 20]} />
                <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>

            {/* Crease Lines - Batting End */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]}>
                <planeGeometry args={[2.64, 0.1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -6.78]}>
                <planeGeometry args={[2.64, 0.1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* Crease Lines - Bowling End */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 8]}>
                <planeGeometry args={[2.64, 0.1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 6.78]}>
                <planeGeometry args={[2.64, 0.1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* Return Creases */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.32, 0.02, -7.39]}>
                <planeGeometry args={[0.08, 2.44]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.32, 0.02, -7.39]}>
                <planeGeometry args={[0.08, 2.44]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
        </group>
    );
}

/**
 * Stumps Component - Creates cricket stumps with bails
 */
function Stumps({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Three Stumps */}
            {[-0.12, 0, 0.12].map((offset, i) => (
                <mesh key={i} position={[offset, 0.36, 0]} castShadow>
                    <cylinderGeometry args={[0.018, 0.018, 0.72, 8]} />
                    <meshStandardMaterial color="#f5f5dc" roughness={0.6} />
                </mesh>
            ))}

            {/* Bails */}
            <mesh position={[0, 0.72, 0]} castShadow>
                <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[-0.06, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.008, 0.008, 0.13, 8]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0.06, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.008, 0.008, 0.13, 8]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
        </group>
    );
}

/**
 * Loads a GLB model and plays its first animation.
 */
function CricketPlayer({ modelPath }: { modelPath: string }) {
    const gltf = useGLTF(modelPath);
    const group = useRef<Group>(null);
    const { actions } = useAnimations(gltf.animations, group);

    useEffect(() => {
        const animationClip = gltf.animations.length > 0 ? gltf.animations[0] : null;

        if (animationClip && actions[animationClip.name]) {
            const action = actions[animationClip.name];
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
            console.log(`Playing animation: ${animationClip.name}`);
        } else {
            console.warn("No animation clip found or action not mapped.");
        }

        return () => {
            if (animationClip && actions[animationClip.name]) {
                actions[animationClip.name]?.stop();
            }
        };
    }, [actions, gltf.animations]);

    return (
        <group ref={group} dispose={null}>
            <primitive object={gltf.scene} scale={2.0} position={[0, 0, -8]} castShadow receiveShadow />
        </group>
    );
}

useGLTF.preload('/models/virat_kohli_cricket.glb');

/**
 * Main Cricket Scene Component
 */
export default function AnimatedModelViewer() {
    const MODEL_PATH = '/models/virat_kohli_cricket.glb';

    return (
        <div style={{ height: '70vh', width: '100vw', backgroundColor: '#1a1a2e' }}>
            <Canvas
                shadows
                camera={{ position: [12, 8, 15], fov: 50 }}
            >
                {/* Sky and Environment */}
                <Sky sunPosition={[100, 20, 100]} />
                <fog attach="fog" args={['#1a1a2e', 30, 80]} />

                {/* Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[15, 20, 10]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize-width={4096}
                    shadow-mapSize-height={4096}
                    shadow-camera-far={50}
                    shadow-camera-left={-30}
                    shadow-camera-right={30}
                    shadow-camera-top={30}
                    shadow-camera-bottom={-30}
                />

                {/* Cricket Field - Green Grass */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <circleGeometry args={[32, 64]} />
                    <meshStandardMaterial color="#1e7a1e" roughness={0.9} />
                </mesh>

                {/* Boundary Circle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[31.5, 32, 64]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>

                {/* Stadium */}
                <Stadium />

                {/* Cricket Pitch */}
                <CricketPitch />

                {/* Stumps - Batting End */}
                <Stumps position={[0, 0, -8]} />

                {/* Stumps - Bowling End */}
                <Stumps position={[0, 0, 8]} />

                {/* Cricket Player */}
                <CricketPlayer modelPath={MODEL_PATH} />

                {/* Orbit Controls */}
                <OrbitControls
                    enableZoom={true}
                    enablePan={true}
                    minPolarAngle={Math.PI / 6}
                    maxPolarAngle={Math.PI / 2.2}
                    minDistance={8}
                    maxDistance={50}
                    target={[0, 1, 0]}
                />
            </Canvas>
        </div>
    );
}