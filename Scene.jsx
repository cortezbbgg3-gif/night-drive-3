import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

// --- ДЫМ (Particles) ---
function SmokeSystem() {
  const mesh = useRef();
  const { smoke, speed } = useStore();
  const count = 50;

  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 1.5,
      y: -10, 
      z: 0,
      scale: 0.1,
      speed: 0.02 + Math.random() * 0.04,
      offset: Math.random() * 100
    }));
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state) => {
    if (!mesh.current) return;
    if (smoke <= 0.05) {
        mesh.current.visible = false;
        return;
    }
    mesh.current.visible = true;

    particles.forEach((p, i) => {
      p.y += p.speed;
      p.z += (speed * 0.01); // Дым сносит ветром
      p.scale += 0.03;

      if (p.y > 2.5 || p.scale > 3) {
         p.y = -1.5; // Респаун под капотом
         p.z = -3;
         p.x = (Math.random() - 0.5) * 2;
         p.scale = 0.1;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.copy(state.camera.rotation);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#888" transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
}

// --- СТОЛБЫ ---
function Poles() {
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
    const move = speed * dt * 0.8;

    items.forEach((item, i) => {
      item.z += move;
      if (item.z > 5) item.z = -600;

      const curveX = Math.sin(item.z * 0.01) * roadCurve;
      dummy.position.set((item.side * 12) + curveX, 3, item.z);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <boxGeometry args={[0.3, 8, 0.3]} />
      <meshStandardMaterial color="#222" />
    </instancedMesh>
  );
}

// --- ДОРОГА ---
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
            varying vec2 vUv; uniform float uCurve;
            void main() { 
                vUv = uv; vec3 p = position; 
                float z = p.z - 5.0; 
                p.x += uCurve * (z*z*0.0005); 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); 
            }
        `,
        fragmentShader: `
            varying vec2 vUv; uniform float uTime;
            void main() { 
                float y = vUv.y * 50.0 + uTime;
                vec3 c = vec3(0.08); 
                float noise = fract(sin(dot(vUv, vec2(12.9, 78.2))) * 43758.5);
                c += noise * 0.02;
                
                float d = step(0.5, sin(y * 3.0));
                float l = step(0.49, vUv.x) - step(0.51, vUv.x);
                c += vec3(1.0, 0.8, 0.0) * l * d;
                
                float s = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x);
                c += vec3(0.5) * s;
                
                float f = smoothstep(0.0, 0.3, vUv.y); 
                gl_FragColor = vec4(mix(c, vec3(0.), f), 1.0); 
            }
        `
    }), []);

    return (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -2, -60]}>
            <planeGeometry args={[20, 200, 40, 60]} />
            <shaderMaterial args={[shader]} />
        </mesh>
    );
}

export function Scene() {
  const { shake } = useStore();
  
  useFrame((state) => {
     // Стабильная камера, которая не улетает
     const s = shake * 0.5;
     state.camera.position.y = 1.4 + (Math.random()-0.5)*s;
     state.camera.position.x = (Math.random()-0.5)*s;
     state.camera.lookAt(0, 1.2, -20);
  });

  return (
    <>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 10, 80]} />
      <ambientLight intensity={0.1} />
      <spotLight position={[0, 3, 0]} angle={0.6} intensity={30} distance={100} color="#fff" />
      
      <Road />
      <Poles />
      {/* ДЫМ ЗДЕСЬ */}
      <SmokeSystem />
    </>
  );
}

