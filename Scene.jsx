import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

// Столбы по бокам
function SideObjects() {
  const meshRef = useRef();
  const { speed, roadCurve } = useStore();
  
  // Создаем 20 столбов
  const count = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Позиции столбов (изначально)
  const positions = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      z: -(i * 20), // Каждые 20 метров
      side: i % 2 === 0 ? 1 : -1 // Слева/Справа
    }))
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Двигаем столбы
    const moveDist = speed * delta * 0.3; // Конвертация скорости в метры

    positions.forEach((pos, i) => {
      pos.z += moveDist;
      
      // Если столб пролетел за спину, кидаем его вперед
      if (pos.z > 5) pos.z = -300;
      
      // Изгиб дороги
      const curveX = Math.sin(pos.z * 0.01) * roadCurve;
      
      dummy.position.set((pos.side * 8) + curveX, 2, pos.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.5, 8, 0.5]} />
      <meshStandardMaterial color="#333" emissive="#111" />
    </instancedMesh>
  );
}

// Дорога
function Road() {
  const ref = useRef();
  const { speed, roadCurve } = useStore();
  
  // Простой шейдер для анимации текстуры и изгиба
  useFrame((state) => {
     if(ref.current) {
         ref.current.material.uniforms.uTime.value += speed * 0.0005;
         ref.current.material.uniforms.uCurve.value = roadCurve;
     }
  });

  const shaderArgs = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uCurve: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      uniform float uCurve;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Изгиб
        float zFactor = pos.z - 5.0; // Начинаем гнуть от камеры
        pos.x += uCurve * (zFactor * zFactor * 0.001);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float y = vUv.y * 20.0 + uTime;
        // Асфальт
        vec3 col = vec3(0.1);
        // Разметка
        float dash = step(0.5, sin(y * 5.0));
        float line = step(0.48, vUv.x) - step(0.52, vUv.x);
        col += vec3(1.0, 0.8, 0.0) * line * dash;
        // Туман (фейковый)
        float fog = smoothstep(0.0, 0.4, vUv.y);
        gl_FragColor = vec4(mix(col, vec3(0.0), fog), 1.0);
      }
    `
  }), []);

  return (
     <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -2, -50]}>
        <planeGeometry args={[20, 200, 40, 40]} />
        <shaderMaterial args={[shaderArgs]} />
     </mesh>
  );
}

export function Scene() {
  const { shake } = useStore();
  useFrame((state) => {
     // Тряска камеры при скорости
     state.camera.position.y = 1.5 + (Math.random()-0.5) * shake;
     state.camera.position.x = (Math.random()-0.5) * shake * 0.5;
     state.camera.lookAt(0, 0, -20);
  });

  return (
    <>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 10, 100]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[0, 2, 0]} angle={0.8} intensity={50} distance={50} color="#fff" />
      
      <Road />
      <SideObjects />
    </>
  );
}
