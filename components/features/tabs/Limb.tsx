import React, { useMemo } from 'react';
import * as THREE from 'three';

interface LimbProps {
    start: [number, number, number]; // [x, y, z]
    end: [number, number, number];   // [x, y, z]
    color?: string;
    thickness?: number;
}

export function Limb({ start, end, color = "#2f3e46", thickness = 0.12 }: LimbProps) {
    // Calculate the shape dynamically
    const { position, rotation, length } = useMemo(() => {
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);

        // 1. Find the middle point (to place the cylinder)
        const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

        // 2. Find the length
        const distance = startVec.distanceTo(endVec);

        // 3. Find the rotation (LookAt)
        // We create a "dummy" object just to calculate the rotation easily
        const obj = new THREE.Object3D();
        obj.position.copy(startVec);
        obj.lookAt(endVec);

        // Rotate 90 degrees because cylinders align along Y-axis by default, 
        // but lookAt aligns along Z-axis
        obj.rotateX(Math.PI / 2);

        return {
            position: midPoint,
            rotation: obj.rotation,
            length: distance
        };
    }, [start, end]);

    return (
        <mesh position={position} rotation={rotation}>
            <cylinderGeometry args={[thickness, thickness, length, 12]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}