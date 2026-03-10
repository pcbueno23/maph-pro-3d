"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Grid, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

interface STLViewerProps {
  geometries: THREE.BufferGeometry[];
}

function Models({ geometries }: { geometries: THREE.BufferGeometry[] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      {geometries.map((geometry, idx) => (
        <Center key={idx}>
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color="#06B6D4"
              roughness={0.3}
              metalness={0.1}
              emissive="#0891B2"
              emissiveIntensity={0.1}
            />
          </mesh>
        </Center>
      ))}
    </group>
  );
}

export function STLViewer({ geometries }: STLViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 100], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />

      <Grid
        position={[0, -20, 0]}
        args={[200, 200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={400}
        fadeStrength={1}
        infiniteGrid
      />

      <Models geometries={geometries} />

      <OrbitControls enablePan enableZoom enableRotate minDistance={50} maxDistance={300} />
    </Canvas>
  );
}

