import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Road } from './Road';
import { Dashboard } from './Dashboard';
import { Overlay } from './Overlay';
import { useStore } from './store';
import './styles.css';

// Component to handle frame loop updates
const GameLoop = () => {
    const updatePhysics = useStore(state => state.updatePhysics);
    useFrame((state, delta) => {
        updatePhysics(delta);
        
        // Dynamic camera shake based on speed
        const speed = useStore.getState().speed;
        state.camera.position.y = 1.6 + Math.sin(state.clock.elapsedTime * 10) * (speed * 0.0002);
        
        // Auto-steering view logic (Look at road curves)
        state.camera.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    });
    return null;
};

export default function App() {
  return (
    <>
      <Canvas 
        shadows 
        camera={{ position: [0.3, 1.6, 2], fov: 60 }} 
        dpr={[1, 2]} // Mobile optimization
        gl={{ antialias: false }} // Let post-processing handle AA logic or skip for performance
      >
        <color attach="background" args={['#020202']} />
        
        {/* Lights */}
        <ambientLight intensity={0.1} />
        {/* Headlights */}
        <spotLight 
            position={[0, 1.0, 0.5]} 
            angle={0.6} 
            penumbra={0.5} 
            intensity={2} 
            distance={50} 
            castShadow 
            color="#fff"
        />
        {/* Dashboard inner light */}
        <pointLight position={[0, 0.5, 1]} intensity={1.5} color="#ff9900" distance={2} />

        <Suspense fallback={null}>
          <GameScene />
        </Suspense>

        <GameLoop />

        <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.5} />
            <Noise opacity={0.1} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
      <Overlay />
    </>
  );
}

function GameScene() {
    return (
        <group>
            <fogExp2 attach="fog" args={['#050505', 0.02]} />
            <Road />
            <Dashboard />
            
            {/* Environment dynamic objects could be added here using instances */}
        </group>
    );
}
