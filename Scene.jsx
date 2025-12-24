import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

// --- СИСТЕМА ДЫМА (PARTICLES) ---
function SmokeEffects() {
  const mesh = useRef();
  const { smoke, speed } = useStore();
  const count = 50;

  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 2,
      y: -10, // Спрятаны
      z: 0,
      scale: 0.1,
      speed: 0.02 + Math.random() * 0.05,
      offset: Math.random() * 100
    }));
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state) => {
    if (!mesh.current) return;
    
    // Если дыма нет, скрываем и выходим
    if (smoke <= 0.05) {
        mesh.current.visible = false;
        return;
    }
    mesh.current.visible = true;

    particles.forEach((p, i) => {
      // Двигаем частицу вверх
      p.y += p.speed;
      // И назад в зависимости от скорости авто
      p.z += (speed * 0.01); 

      // Расширяем (дым рассеивается)
      p.scale += 0.03;

      // Респаун
      if (p.y > 3 || p.scale > 3) {
         p.y = -1.5; // Под капотом
         p.z = -4;   // Перед камерой
         p.x = (Math.random() - 0.5) * 2;
         p.scale = 0.1;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.copy(state.camera.rotation); // Billboard
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#aaa" transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
}

// --- СТОЛБЫ И ОКРУЖЕНИЕ ---
function Environment() {
  const mesh = useRef();
  const { speed, roadCurve } = useStore();
  const count = 30;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const items = useMemo(() => new Array(count).fill(0).map((_, i) => ({ 
      z: -(i * 20), 
      side: i % 2 === 0 ? 1 : -1 
  })), []);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    const move = speed * dt * 0.8; // Скорость движения мира

    items.forEach((item, i) => {
      item.z += move;
      if (item.z > 10) item.z = -500; // Респаун вдалеке

      // Изгиб дороги влияет на позицию X
      const curveX = Math.sin(item.z * 0.01) * roadCurve;

      dummy.position.set((item.side * 12) + curveX, 4, item.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <boxGeometry args={[0.5, 12, 0.5]} />
      <meshStandardMaterial color="#111" />
    </instancedMesh>
  );
}

// --- ДОРОГА (ШЕЙДЕР) ---
function Road() {
    const ref = useRef();
    const { speed, roadCurve } = useStore();
    
    useFrame((_, dt) => {
        if(ref.current) {
            ref.current.material.uniforms.uTime.value += speed * dt * 0.1;
            ref.current.material.uniforms.uCurve.value = roadCurve;
        }
    });

    const shader = useMemo(() => ({
        uniforms: { uTime: { value: 0 }, uCurve: { value: 0 } },
        vertexShader: `
            varying vec2 vUv; 
            uniform float uCurve; 
            void main() { 
                vUv = uv; 
                vec3 p = position; 
                float z = p.z - 5.0; 
                p.x += uCurve * (z*z*0.001); 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); 
            }
        `,
        fragmentShader: `
            varying vec2 vUv; 
            uniform float uTime; 
            void main() { 
                float y = vUv.y * 30.0 + uTime; 
                // Асфальт
                vec3 c = vec3(0.08); 
                // Разметка
                float d = step(0.5, sin(y * 5.0)); 
                float l = step(0.49, vUv.x) - step(0.51, vUv.x); 
                c += vec3(1.0, 0.8, 0.0) * l * d; 
                // Бока
                float s = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x);
                c += vec3(0.5) * s;
                // Туман
                float f = smoothstep(0.0, 0.3, vUv.y); 
                gl_FragColor = vec4(mix(c, vec3(0.), f), 1.0); 
            }
        `
    }), []);

    return (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -2, -60]}>
            <planeGeometry args={[24, 200, 40, 60]} />
            <shaderMaterial args={[shader]} />
        </mesh>
    );
}

export function Scene() {
  const { shake } = useStore();
  
  useFrame((state) => {
     // Тряска камеры
     state.camera.position.y = 1.4 + (Math.random()-0.5) * shake;
     state.camera.position.x = (Math.random()-0.5) * shake * 0.6;
     state.camera.lookAt(0, 1.0, -20);
  });

  return (
    <>
      <color attach="background" args={['#020202']} />
      <fog attach="fog" args={['#020202', 20, 90]} />
      
      {/* СВЕТ */}
      <ambientLight intensity={0.1} />
      <spotLight position={[0, 2, 0]} angle={0.8} intensity={40} distance={80} color="#fff" penumbra={0.5} />
      <pointLight position={[0, 1, -2]} intensity={2} color="#f00" distance={5} /> {/* Подсветка приборов */}

      <Road />
      <Environment />
      <SmokeEffects />
    </>
  );
}

