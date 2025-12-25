import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

// ДЫМ
function SmokeSystem() {
  const mesh = useRef();
  const { smoke, speed } = useStore();
  const count = 40;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => new Array(count).fill(0).map(() => ({
      x: (Math.random()-0.5)*2, y: -10, z: 0, scale: 0.1, speed: 0.02+Math.random()*0.03
  })), []);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    if (smoke <= 0.01) { mesh.current.visible = false; return; }
    mesh.current.visible = true;

    particles.forEach((p, i) => {
      p.y += p.speed;
      p.z += speed * 0.005; // Сдувает назад
      p.scale += 0.05;
      if(p.y > 3) { p.y = -1.5; p.z = -3; p.scale = 0.1; }
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[null, null, count]}><planeGeometry /><meshBasicMaterial color="#888" transparent opacity={0.4} /></instancedMesh>;
}

// ДОРОГА
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
        vertexShader: `varying vec2 vUv; uniform float uCurve; void main() { vUv = uv; vec3 p = position; float z = p.z - 5.0; p.x += uCurve * (z*z*0.0005); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `varying vec2 vUv; uniform float uTime; void main() { float y = vUv.y * 30.0 + uTime; vec3 c = vec3(0.1); float n = fract(sin(dot(vUv, vec2(12.9, 78.2)))*43758.5); c += n*0.03; float d = step(0.5, sin(y * 3.0)); float l = step(0.49, vUv.x) - step(0.51, vUv.x); c += vec3(1., 0.8, 0.) * l * d; float s = step(0.05, vUv.x) - step(0.07, vUv.x) + step(0.93, vUv.x) - step(0.95, vUv.x); c += vec3(0.5) * s; float f = smoothstep(0.0, 0.3, vUv.y); gl_FragColor = vec4(mix(c, vec3(0.), f), 1.0); }`
    }), []);
    return <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -2, -60]}><planeGeometry args={[20, 200, 40, 60]} /><shaderMaterial args={[shader]} /></mesh>;
}

// СТОЛБЫ
function Poles() {
  const mesh = useRef();
  const { speed, roadCurve } = useStore();
  const count = 30;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const items = useMemo(() => new Array(count).fill(0).map((_,i) => ({ z: -(i*20), side: i%2===0?1:-1 })), []);
  useFrame((_, dt) => {
      if(!mesh.current) return;
      const move = speed * dt * 0.8;
      items.forEach((it, i) => {
          it.z += move;
          if(it.z > 5) it.z = -600;
          const cx = Math.sin(it.z * 0.01) * roadCurve;
          dummy.position.set((it.side * 12) + cx, 3, it.z);
          dummy.updateMatrix();
          mesh.current.setMatrixAt(i, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[null, null, count]}><boxGeometry args={[0.3, 10, 0.3]} /><meshStandardMaterial color="#111" /></instancedMesh>;
}

export function Scene() {
  const { shake } = useStore();
  useFrame((state) => {
     const s = shake * 0.5;
     state.camera.position.set((Math.random()-0.5)*s, 1.4 + (Math.random()-0.5)*s, 5);
     state.camera.lookAt(0, 1.0, -20);
  });
  return (
    <>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 10, 100]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[0, 4, 0]} intensity={40} angle={0.6} distance={80} color="#fff" />
      <Road />
      <Poles />
      <SmokeSystem />
    </>
  );
}

