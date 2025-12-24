import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

const RoadMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vZ;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Искривление дороги (Curve)
      float curve = sin(uTime * 0.2) * 20.0;
      pos.x += curve * pow(pos.y, 2.0) * 0.001;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      vZ = pos.z;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vZ;
    uniform float uTime;
    
    void main() {
      float y = vUv.y * 20.0 + uTime * 10.0; // Скорость текстуры
      
      // Асфальт
      vec3 color = vec3(0.1);
      
      // Разметка
      float line = step(0.48, vUv.x) - step(0.52, vUv.x);
      float dash = step(0.5, sin(y));
      color += vec3(1.0, 0.8, 0.0) * line * dash;
      
      // Боковые
      float border = step(0.05, vUv.x) - step(0.08, vUv.x) + step(0.92, vUv.x) - step(0.95, vUv.x);
      color += vec3(0.8) * border;

      // Трава по бокам
      if (vUv.x < 0.05 || vUv.x > 0.95) color = vec3(0.02, 0.05, 0.01);

      // Туман
      float fog = smoothstep(0.0, 0.4, vUv.y);
      color = mix(color, vec3(0.0), fog);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function Scene() {
  const matRef = useRef();
  const { speed, odometer } = useStore();
  
  useFrame((state) => {
    if (matRef.current) {
        // uTime управляет движением текстуры
        matRef.current.uniforms.uTime.value = odometer * 0.1;
    }
    // Тряска камеры при скорости
    const shake = useStore.getState().shake;
    state.camera.position.x = (Math.random() - 0.5) * shake;
    state.camera.position.y = 1.5 + (Math.random() - 0.5) * shake;
  });

  return (
    <>
      <color attach="background" args={['#000']} />
      
      {/* Дорога */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[20, 200, 20, 20]} />
        <shaderMaterial ref={matRef} attach="material" args={[RoadMaterial]} />
      </mesh>
      
      {/* Свет фар */}
      <spotLight position={[0, 1, 0]} angle={0.6} penumbra={0.5} intensity={2} distance={40} color="#fff" />
    </>
  );
}

