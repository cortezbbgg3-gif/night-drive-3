import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

function Road() {
    const ref = useRef();
    const { speed, roadCurve } = useStore();
    useFrame((_, dt) => {
        if (ref.current) {
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
                vec3 c = vec3(0.05); // Dark Asphalt
                float noise = fract(sin(dot(vUv, vec2(12.9, 78.2))) * 43758.5);
                c += noise * 0.02;
                
                // Line
                float d = step(0.5, sin(y * 3.0));
                float w = step(0.49, vUv.x) - step(0.51, vUv.x);
                c += vec3(1., 0.8, 0.) * w * d;
                
                // Fog
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

function Poles() {
  const mesh = useRef();
  const { speed, roadCurve } = useStore();
  const count = 30;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => new Array(count).fill(0).map((_,i) => ({ z: -(i*20), side: i%2===0?1:-1 })), []);

  useFrame((_, dt) => {
      if(!mesh.current) return;
      const move = speed * dt * 0.8;
      data.forEach((d, i) => {
          d.z += move;
          if(d.z > 5) d.z = -600;
          const curve = Math.sin(d.z * 0.01) * roadCurve;
          dummy.position.set((d.side * 12) + curve, 3, d.z);
          dummy.updateMatrix();
          mesh.current.setMatrixAt(i, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
        <boxGeometry args={[0.3, 10, 0.3]} />
        <meshStandardMaterial color="#222" />
    </instancedMesh>
  );
}

export function Scene() {
  const { shake } = useStore();
  useFrame((state) => {
     // Camera Shake logic
     const s = shake * 0.5;
     state.camera.position.y = 1.4 + (Math.random()-0.5)*s;
     state.camera.position.x = (Math.random()-0.5)*s;
     // Look straight ahead, not dependent on curve (prevents nausea)
     state.camera.lookAt(0, 1.2, -20);
  });

  return (
    <>
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 10, 80]} />
        <ambientLight intensity={0.2} />
        <spotLight position={[0, 3, 0]} intensity={30} angle={0.6} distance={100} color="white" />
        <Road />
        <Poles />
    </>
  );
}
l
