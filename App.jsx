import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- UI КОМПОНЕНТ ---
const DashboardUI = () => {
  const { rpm, speed, lights, ignition, engineRunning, setGas, setBrake, startEngine, toggleLights } = useStore();
  // Состояния для визуального эффекта нажатия педалей
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);

  // Углы поворота стрелок
  const rpmDeg = -130 + (rpm / 8000) * 260;
  const speedDeg = -130 + (speed / 240) * 260;

  const handlePedal = (type, pressed) => {
      if(type === 'gas') { setGas(pressed ? 1 : 0); setGasPressed(pressed); }
      if(type === 'brake') { setBrake(pressed ? 1 : 0); setBrakePressed(pressed); }
  };

  return (
    <div className="ui-layer">
      <div className="dashboard-container">
        <div className="dashboard-bg" /> {/* Текстурированный фон */}

        {/* Кнопки Start/Lights */}
        <div className="center-controls">
            <div className={`btn btn-start ${engineRunning ? 'active' : ''}`} onClick={startEngine}>
                START<br/>ENGINE
            </div>
            <div className={`btn btn-lights ${lights ? 'active' : ''}`} onClick={toggleLights}>
                LIGHTS
            </div>
        </div>

        {/* Приборы */}
        <div className={`cluster ${ignition ? 'lit' : ''}`}>
            {/* RPM */}
            <div className="gauge">
                <div className="gauge-label">RPM x1000</div>
                <div className="gauge-value">{(rpm/1000).toFixed(1)}</div>
                <div className="needle-wrapper" style={{ transform: `rotate(${rpmDeg}deg)` }}>
                    <div className="needle" />
                    <div className="needle-cap" />
                </div>
            </div>
            {/* SPEED */}
            <div className="gauge">
                <div className="gauge-label">KM/H</div>
                <div className="gauge-value">{Math.round(speed)}</div>
                <div className="needle-wrapper" style={{ transform: `rotate(${speedDeg}deg)` }}>
                    <div className="needle" style={{ background: 'var(--primary-glow)', boxShadow:'0 0 8px var(--primary-glow)' }}/>
                    <div className="needle-cap" />
                </div>
            </div>
        </div>

        {/* Педали (Напольные) */}
        <div className="pedals-container">
            <div className={`pedal-box ${brakePressed ? 'pressed' : ''}`}
                 onTouchStart={() => handlePedal('brake', true)} 
                 onTouchEnd={() => handlePedal('brake', false)}
                 onMouseDown={() => handlePedal('brake', true)} 
                 onMouseUp={() => handlePedal('brake', false)}
            >
                <div className="pedal-plate" />
                <span className="pedal-label">BRAKE</span>
            </div>

            <div className={`pedal-box ${gasPressed ? 'pressed' : ''}`}
                 onTouchStart={() => handlePedal('gas', true)} 
                 onTouchEnd={() => handlePedal('gas', false)}
                 onMouseDown={() => handlePedal('gas', true)} 
                 onMouseUp={() => handlePedal('gas', false)}
            >
                <div className="pedal-plate" />
                <span className="pedal-label">GAS</span>
            </div>
        </div>

      </div>
    </div>
  );
};

// Физический цикл
const GameLoop = () => {
    const updatePhysics = useStore(s => s.updatePhysics);
    useFrame((_, dt) => updatePhysics(dt));
    return null;
}

export default function App() {
  return (
    <>
      {/* 1. 3D Мир (На заднем плане, на весь экран) */}
      <div className="canvas-layer">
          <Canvas camera={{ position: [0, 1.2, 4], fov: 65 }} dpr={[1, 1.5]}>
            <Scene />
            <GameLoop />
            {/* Пост-обработка для киношности */}
            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.1} intensity={1.0} levels={9} mipmapBlur />
                <Noise opacity={0.05} /> { /* Легкая зернистость пленки */ }
                <Vignette offset={0.3} darkness={0.7} /> { /* Затемнение углов */ }
            </EffectComposer>
          </Canvas>
      </div>

      {/* 2. 2D Интерфейс (Поверх всего) */}
      <DashboardUI />
      
      {/* 3. Звук */}
      <AudioEngine />
    </>
  );
}
