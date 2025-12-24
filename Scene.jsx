import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

const RoadShader = {
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vZ;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Искривление горизонта
      pos.y -= pow(pos.z, 2.0) * 0.0015;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      vZ = pos.z;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vZ;
    uniform float uTime;
    void main() {
      // Скорость полос
      float y = vUv.y * 30.0 + uTime;
      
      // Базовый цвет асфальта
      vec3 col = vec3(0.08); 
      
      // Шум
      float noise = fract(sin(dot(vUv * 100.0, vec2(12.9, 78.2))) * 43758.5);
      col += noise * 0.02;

      // Центральная полоса
      float center = step(0.49, vUv.x) - step(0.51, vUv.x);
      float dash = step(0.5, sin(y));
      col += vec3(1.0, 0.9, 0.0) * center * dash;

      // Боковые линии
      float sides = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x);
      col += vec3(0.6) * sides;

      // Туман (уход в черноту)
      float fog = smoothstep(0.0, 0.8, vUv.y); 
      col = mix(col, vec3(0.0), fog);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

export function Scene() {
  const ref = useRef();
  const { odometer, shake } = useStore();
  
  useFrame((state) => {
    if (ref.current) {
        ref.current.uniforms.uTime.value = odometer * 0.2;
    }
    // Тряска камеры (Pitch & Yaw)
    state.camera.position.y = 1.5 + (Math.random()-0.5) * shake;
    state.camera.position.x = (Math.random()-0.5) * shake * 0.5;
  });

  return (
    <>
      <color attach="background" args={['#000']} />
      
      {/* Дорога (Опущена ниже, чтобы не перекрывать камеру) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -10]}>
         <planeGeometry args={[20, 200, 20, 40]} />
         <shaderMaterial ref={ref} attach="material" args={[RoadShader]} />
      </mesh>
      
      {/* Фары */}
      <spotLight position={[0, 1.5, 0]} angle={0.5} penumbra={0.5} intensity={50} distance={60} color="#fff" />
      <ambientLight intensity={0.2} />
    </>
  );
}

