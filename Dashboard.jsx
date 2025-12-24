import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

const Gauge = ({ position, value, max, label, unit }) => {
  const needleRef = useRef();
  
  useFrame((state) => {
    // Rotation logic: -2.5 rad (min) to 0.5 rad (max)
    const normalized = Math.min(value / max, 1);
    const targetRot = -2.5 + (normalized * 3.0);
    
    if (needleRef.current) {
        // Smooth lerp for needle + Jitter
        needleRef.current.rotation.z = THREE.MathUtils.lerp(needleRef.current.rotation.z, targetRot, 0.1);
        // Add mechanical jitter
        needleRef.current.rotation.z += (Math.random() - 0.5) * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Rim */}
      <mesh>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Face */}
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Ticks (Procedural) */}
      {Array.from({ length: 9 }).map((_, i) => (
         <mesh key={i} position={[0.7 * Math.cos(-2.5 + i * 0.375), 0.7 * Math.sin(-2.5 + i * 0.375), 0.01]} rotation={[0,0, -2.5 + i * 0.375]}>
            <planeGeometry args={[0.1, 0.02]} />
            <meshBasicMaterial color="#fea" />
         </mesh>
      ))}
      {/* Label */}
      <Text position={[0, -0.4, 0.01]} fontSize={0.2} color="white" font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">
        {label}
        <meshBasicMaterial color="#fea" />
      </Text>
      
      {/* Needle */}
      <group ref={needleRef} position={[0, 0, 0.05]}>
          <mesh position={[0.4, 0, 0]}>
             <boxGeometry args={[0.8, 0.04, 0.01]} />
             <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
          </mesh>
      </group>
    </group>
  );
};

export function Dashboard() {
  const { rpm, speed } = useStore();
  const dashRef = useRef();

  useFrame((state) => {
    // Vibration at high RPM
    if (dashRef.current) {
        const shake = rpm > 5000 ? (rpm - 5000) / 100000 : 0;
        dashRef.current.position.y = -1.5 + (Math.random() - 0.5) * shake;
        dashRef.current.position.x = (Math.random() - 0.5) * shake;
    }
  });

  return (
    <group ref={dashRef} position={[0, -1.5, -2]}>
        {/* Main Dashboard Body */}
        <mesh position={[0, 0, -0.5]}>
            <boxGeometry args={[10, 3, 2]} />
            <meshStandardMaterial color="#3e2723" roughness={0.8} /> {/* Wood/Leather */}
        </mesh>
        
        {/* Top Pad (Leather) */}
        <mesh position={[0, 1.55, -0.5]} rotation={[-0.2, 0, 0]}>
             <boxGeometry args={[10.2, 0.2, 2.2]} />
             <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>

        {/* Ambient Dashboard Light (Warm) */}
        <pointLight position={[0, 1, 1]} intensity={0.5} color="#ffaa00" distance={5} />

        {/* Gauges */}
        <Gauge position={[-1.5, 0.5, 0.6]} value={rpm} max={8000} label="RPM" />
        <Gauge position={[1.5, 0.5, 0.6]} value={speed} max={200} label="KM/H" />
        
        {/* Steering Wheel (Visual only, auto-rotates slightly) */}
        <group position={[0, -0.5, 1.5]} rotation={[0, 0, 0]}>
            <mesh rotation={[1.6, 0, 0]}>
                <torusGeometry args={[1.6, 0.1, 16, 100]} />
                <meshStandardMaterial color="#111" roughness={0.3} metalness={0.5} />
            </mesh>
             {/* Steering center */}
            <mesh rotation={[1.6, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2]} />
                 <meshStandardMaterial color="#222" />
            </mesh>
             <mesh position={[0,0,0]} rotation={[0,0,1]}>
                <boxGeometry args={[3, 0.1, 0.1]} />
                 <meshStandardMaterial color="#333" />
            </mesh>
        </group>
    </group>
  );
}
