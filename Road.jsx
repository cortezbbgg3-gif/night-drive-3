import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

const RoadMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uFogColor: { value: new THREE.Color('#050505') }
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vDist;
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Curvature (World Bending)
      float dist = length(position.xz);
      pos.y -= dist * dist * 0.002; // Downward curve for horizon
      
      // Slight S-curve
      pos.x += sin(pos.z * 0.05 + uTime * 0.1) * (pos.z * 0.1); 

      vDist = pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vDist;
    uniform float uTime;
    uniform vec3 uFogColor;
    
    void main() {
      // Procedural Asphalt
      float noise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 roadColor = vec3(0.1) + noise * 0.05;
      
      // Moving Stripes
      float lane = step(0.48, vUv.x) - step(0.52, vUv.x);
      float dash = step(0.5, sin(vUv.y * 40.0 + uTime * 20.0));
      vec3 paint = vec3(1.0, 0.9, 0.5) * lane * dash;
      
      vec3 finalColor = roadColor + paint;
      
      // Fog
      float fogFactor = smoothstep(10.0, 80.0, vDist); // Fog depth
      gl_FragColor = vec4(mix(finalColor, uFogColor, fogFactor), 1.0);
    }
  `
};

export function Road() {
  const ref = useRef();
  const distance = useStore(s => s.distance);
  
  useFrame((state) => {
    if (ref.current) {
        // Мы используем пройденную дистанцию для смещения текстуры в шейдере
        ref.current.uniforms.uTime.value = distance * 0.05; 
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[20, 200, 20, 200]} />
      <shaderMaterial attach="material" args={[RoadMaterial]} ref={ref} />
    </mesh>
  );
}
