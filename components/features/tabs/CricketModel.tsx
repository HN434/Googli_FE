// components/AnimatedModelViewer.tsx
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment } from '@react-three/drei';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Group } from 'three'; // Import Group type for the scene reference

/**
 * Loads a GLB model and plays its first animation.
 * @param modelPath The path to the GLB file (e.g., /models/player.glb)
 */
function CricketModel({ modelPath }: { modelPath: string }) {
    // Use useGLTF to load the model and its data
    const gltf = useGLTF(modelPath);

    // Create a ref for the scene group to pass to useAnimations
    const group = useRef<Group>(null);

    // useAnimations hook extracts animation actions
    // The gltf.scene is cast to a THREE.Object3D (Group is a subclass)
    const { actions } = useAnimations(gltf.animations, group);

    useEffect(() => {
        // Check if there are any animation clips in the GLB file
        const animationClip = gltf.animations.length > 0 ? gltf.animations[0] : null;

        if (animationClip && actions[animationClip.name]) {
            const action = actions[animationClip.name];

            // Set the animation to loop indefinitely and play
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
            console.log(`Playing animation: ${animationClip.name}`);
        } else {
            console.warn("No animation clip found or action not mapped.");
        }

        // Cleanup: stop the animation when the component unmounts
        return () => {
            if (animationClip && actions[animationClip.name]) {
                actions[animationClip.name]?.stop();
            }
        };
    }, [actions, gltf.animations]);

    // The <primitive> component renders the loaded GLTF scene
    return (
        <group ref={group} dispose={null}>
            <primitive object={gltf.scene} scale={2.0} position={[0, -1, 0]} />
        </group>
    );
}

// Preload the model to improve load times (optional but recommended)
useGLTF.preload('/models/virat_kohli_cricket.glb');


// --- Main Export Component ---
export default function AnimatedModelViewer() {
    const MODEL_PATH = '/models/virat_kohli_cricket.glb'; // 👈 IMPORTANT: Change this to your file name

    return (
        <div style={{ height: '70vh', width: '100vw', backgroundColor: '#e0e0e0' }}>
            <Canvas
                shadows
                camera={{ position: [5, 3, 5], fov: 40 }} // Adjusted camera for better view
            >
                {/* Environment and Lighting */}
                <ambientLight intensity={0.8} />
                <directionalLight
                    position={[10, 15, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />

                {/* Ground Plane */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                    <planeGeometry args={[20, 20]} />
                    <meshStandardMaterial color="lightgreen" />
                </mesh>

                {/* Orbit Controls for User Interaction */}
                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                />

                {/* Load the Animated Model */}
                <CricketModel modelPath={MODEL_PATH} />
            </Canvas>
        </div>
    );
}