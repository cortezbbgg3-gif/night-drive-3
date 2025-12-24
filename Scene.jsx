import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';

const RoadMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#111') }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      // Движение текстуры
      float y = vUv.y + uTime;
      
      // Асфальт
      float noise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 color = vec3(0.05) + noise * 0.02;
      
      // Линии разметки
      float centerLine = step(0.49, vUv.x) - step(0.51, vUv.x);
      float dash = step(0.5, sin(y * 40.0));
      
      // Боковые
      float sideLine = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x);
      
      color += vec3(1.0, 0.8, 0.0) * centerLine * dash;
      color += vec3(0.8) * sideLine;
      
      // Затемнение вдаль (Fog manually)
      float fog = smoothstep(0.0, 1.0, vUv.y); // Верхняя часть UV это даль
      color = mix(color, vec3(0.0), fog); // Черный горизонт
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function Scene() {
  const roadRef = useRef();
  const { speed, lights } = useStore();
  const timeRef = useRef(0);

  useFrame((state, dt) => {
    // Двигаем дорогу
    timeRef.current += (speed * 0.01) * dt;
    if (roadRef.current) {
        roadRef.current.uniforms.uTime.value = timeRef.current;
    }
    
    // Тряска камеры от скорости
    const shake = (speed / 300) * 0.02;
    state.camera.position.x = (Math.random() - 0.5) * shake;
    state.camera.position.y = 1.0 + (Math.random() - 0.5) * shake;
  });

  return (
    <>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 5, 40]} />
      
      {/* Свет фар (динамический) */}
      {lights && (
        <spotLight 
            position={[0, 1, 0]} 
            angle={0.5} 
            penumbra={0.5} 
            intensity={2} 
            distance={50} 
            castShadow 
            target-position={[0,0,-20]}
        />
      )}

      {/* Дорога (Plane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -20]} scale={[1, 1, 1]}>
        <planeGeometry args={[20, 100]} />
        <shaderMaterial ref={roadRef} attach="material" args={[RoadMaterial]} transparent />
      </mesh>
    </>
  );
}
