import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

// Шейдер для бесконечной дороги с изгибом
const RoadShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#111') }
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vZ;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Искривление мира (Curved Horizon)
      float curve = pos.z * 0.02;
      pos.y -= curve * curve; 
      
      // Динамический изгиб дороги влево-вправо
      pos.x += sin(pos.z * 0.05 + uTime * 0.5) * (pos.z * 0.2);

      vZ = pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vZ;
    uniform float uTime;
    
    void main() {
      // Асфальт (Шум)
      float noise = fract(sin(dot(vUv * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 col = vec3(0.05) + noise * 0.02;
      
      // Разметка (Полосы едут)
      float scroll = vUv.y + uTime; // Движение текстуры
      float stripes = step(0.48, vUv.x) - step(0.52, vUv.x);
      float dashes = step(0.5, sin(scroll * 40.0));
      
      // Боковые линии
      float sideLines = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x);
      
      col += vec3(0.8, 0.7, 0.5) * stripes * dashes; // Центр (желтый)
      col += vec3(0.8) * sideLines; // Бока (белый)

      // Туман (Черный горизонт)
      float fog = smoothstep(5.0, 100.0, vZ);
      col = mix(col, vec3(0.0), fog);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

export function Road() {
  const ref = useRef();
  const distance = useStore(s => s.distance);
  
  useFrame(() => {
    if (ref.current) {
        // Синхронизация скорости текстуры со скоростью авто
        ref.current.uniforms.uTime.value = distance * 0.05;
    }
  });

  return (
    <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -50]}>
            <planeGeometry args={[20, 200, 40, 200]} />
            <shaderMaterial attach="material" args={[RoadShader]} ref={ref} />
        </mesh>
        
        {/* Земля по бокам */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -2.1, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#020202" roughness={1} />
        </mesh>
    </group>
  );
}
