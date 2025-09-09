import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Ring } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface NovaScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  animated?: boolean;
}

const AnimatedRing = ({ score, maxScore = 100 }: { score: number; maxScore: number }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005;
    }
  });

  const progress = score / maxScore;
  const color = score >= 80 ? '#10B981' : score >= 65 ? '#93C572' : score >= 50 ? '#F59E0B' : '#FF6B6B';

  return (
    <group>
      {/* Background ring */}
      <Ring ref={ringRef} args={[2, 2.5, 64]} rotation={[0, 0, 0]}>
        <meshBasicMaterial color="#404040" transparent opacity={0.3} />
      </Ring>
      
      {/* Progress ring */}
      <Ring
        ref={progressRef}
        args={[2, 2.5, Math.round(64 * progress)]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <meshBasicMaterial color={color} />
      </Ring>
    </group>
  );
};

const NovaScoreRing: React.FC<NovaScoreRingProps> = ({
  score,
  maxScore = 100,
  size = 200,
  animated = true,
}) => {
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-accent-success';
    if (score >= 65) return 'text-accent-primary';
    if (score >= 50) return 'text-accent-warning';
    return 'text-accent-danger';
  };

  const getRiskCategory = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 3D Ring */}
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 0, 8], fov: 45 }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} />
        <AnimatedRing score={score} maxScore={maxScore} />
      </Canvas>

      {/* Score Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={`text-4xl font-mono font-bold ${getRiskColor(score)}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
            delay: 0.5,
          }}
        >
          {animated ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              {score.toFixed(1)}
            </motion.span>
          ) : (
            score.toFixed(1)
          )}
        </motion.div>
        
        <motion.div
          className="text-sm text-text-secondary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          out of {maxScore}
        </motion.div>
        
        <motion.div
          className={`text-sm font-medium mt-1 ${getRiskColor(score)}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
        >
          {getRiskCategory(score)}
        </motion.div>
      </div>
    </div>
  );
};

export default NovaScoreRing;