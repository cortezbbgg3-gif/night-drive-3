import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- КОМПОНЕНТ ПРИБОРНОЙ ПАНЕЛИ (HTML) ---
const DashboardUI = () => {
  const { rpm, speed, gear, lights, ignition, engineRunning, gasInput, brakeInput, setGas, setBrake, startEngine, toggleLights } = useStore();
  
  // Вычисляем поворот стрелок (CSS rotate)
  // RPM: 0 = -130deg, 8000 = +130deg
  const rpmDeg = -130 + (rpm / 8000) * 260;
  // Speed: 0 = -130deg, 220 = +130deg
  const speedDeg = -130 + (speed / 240) * 260;

  // Хендлеры для педалей
  const handlePedal = (type, val) => {
      if(type === 'gas') setGas(val);
      if(type === 'brake') setBrake(val);
  };

  return (
    <div className="ui-layer">
      {/* 2D DASHBOARD */}
      <div className="dashboard">
        
        {/* КНОПКИ ЦЕНТРА */}
        <div className="center-console">
            <div className={`btn-car btn-start ${engineRunning ? 'on' : ''}`} onClick={startEngine}>
                START<br/>ENGINE
            </div>
            <div className={`btn-car ${lights ? 'active' : ''}`} onClick={toggleLights}>
                LIGHTS
            </div>
        </div>

        <div className="cluster">
            {/* ТАХОМЕТР */}
            <div className={`gauge ${ignition ? 'lit' : ''}`}>
                <div className="dial-face" />
                <div className="gauge-label">RPM</div>
                <div className={`gauge-value ${ignition ? 'visible' : ''}`}>{Math.round(rpm)}</div>
                
                {/* Стрелка вращается через CSS */}
                <div className="needle-container" style={{ transform: `rotate(${rpmDeg}deg)` }}>
                    <div className="needle" />
                    <div className="needle-cap" />
                </div>
                {/* Маркеры (Ticks) */}
                <div style={{position:'absolute', top: '10px', left:'50%', color:'red', fontSize:'10px'}}>x1000</div>
            </div>

            {/* СПИДОМЕТР */}
            <div className={`gauge ${ignition ? 'lit' : ''}`}>
                <div className="dial-face" />
                <div className="gauge-label">KM/H</div>
                <div className={`gauge-value ${ignition ? 'visible' : ''}`}>{Math.round(speed)}</div>
                
                <div className="needle-container" style={{ transform: `rotate(${speedDeg}deg)` }}>
                    <div className="needle" style={{ background: '#ffaa00', boxShadow:'0 0 5px orange' }} />
                    <div className="needle-cap" />
                </div>
            </div>
        </div>

        {/* ПЕДАЛИ */}
        <div className="controls-area">
            {/* ТОРМОЗ */}
            <div className="pedal-wrapper" 
                 onTouchStart={() => handlePedal('brake', 1)} 
                 onTouchEnd={() => handlePedal('brake', 0)}
                 onMouseDown={() => handlePedal('brake', 1)} 
                 onMouseUp={() => handlePedal('brake', 0)}
            >
                <div className="pedal">
                    <div className="pedal-fill" style={{ height: `${brakeInput * 100}%` }} />
                </div>
                <span className="pedal-label">BRAKE</span>
            </div>

            {/* ГАЗ */}
            <div className="pedal-wrapper"
                 onTouchStart={() => handlePedal('gas', 1)} 
                 onTouchEnd={() => handlePedal('gas', 0)}
                 onMouseDown={() => handlePedal('gas', 1)} 
                 onMouseUp={() => handlePedal('gas', 0)}
            >
                <div className="pedal">
                    <div className="pedal-fill" style={{ height: `${gasInput * 100}%` }} />
                </div>
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
    useFrame((_, dt) => {
        updatePhysics(dt);
    });
    return null;
}

export default function App() {
  return (
    <>
      {/* 1. Canvas - Это 3D мир (Дорога) */}
      <div className="canvas-layer">
          <Canvas camera={{ position: [0, 1.5, 3], fov: 75 }}>
            <Scene />
            <GameLoop />
            <EffectComposer>
                <Bloom luminanceThreshold={0.2} intensity={1.5} />
            </EffectComposer>
          </Canvas>
      </div>

      {/* 2. UI - Приборка и кнопки поверх всего */}
      <DashboardUI />
      
      {/* 3. Звук (невидим) */}
      <AudioEngine />
    </>
  );
}
