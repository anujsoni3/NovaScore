import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Box, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

const FloatingShape = ({ position, shape, color }: any) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x += 0.01;
      ref.current.rotation.y += 0.01;
    }
  });

  const ShapeComponent = shape === 'sphere' ? Sphere : shape === 'box' ? Box : Octahedron;

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
      <ShapeComponent ref={ref} args={[1]} position={position}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.7}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </ShapeComponent>
    </Float>
  );
};

const FloatingShapes = () => {
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 10], fov: 60 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <FloatingShape position={[-6, 3, -2]} shape="sphere" color="#93C572" />
<FloatingShape position={[6, -2, 2]} shape="box" color="#4ADE80" />
<FloatingShape position={[-3, -4, 1]} shape="octahedron" color="#10B981" />
<FloatingShape position={[5, 4, -1]} shape="sphere" color="#93C572" />
<FloatingShape position={[-7, -1, 3]} shape="box" color="#4ADE80" />
<FloatingShape position={[-2, 5, 2]} shape="octahedron" color="#10B981" />
<FloatingShape position={[4, -5, -2]} shape="sphere" color="#93C572" />
<FloatingShape position={[-6, -2, -3]} shape="box" color="#4ADE80" />
<FloatingShape position={[-5, 0, 4]} shape="box" color="#4ADE80" />
<FloatingShape position={[3, -4, 2]} shape="octahedron" color="#10B981" />
<FloatingShape position={[-4, -5, -1]} shape="sphere" color="#93C572" />
<FloatingShape position={[6, 2, 1]} shape="box" color="#4ADE80" />
<FloatingShape position={[2, 5, 2]} shape="octahedron" color="#10B981" />
<FloatingShape position={[5, 3, 2]} shape="sphere" color="#93C572" />

    </Canvas>
  );
};

export default FloatingShapes;