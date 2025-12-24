import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- UI DASHBOARD ---
const Dashboard = () => {
  const { rpm, speed, gear, engineRunning, lights, nitroActive, gas, brake, setGas, setBrake, setNitro, toggleIgnition, toggleLights } = useStore();
  
  // Углы стрелок
  const rpmDeg = -135 + (rpm / 8000) * 270;
  const speedDeg = -135 + (speed / 280) * 270;

  // ЛОГИКА СЛАЙДЕРА (ПЕДАЛЕЙ)
  const handleTouch = (e, type) => {
    const touch = e.touches[0];
    const target = e.currentTarget.getBoundingClientRect();
    
    // Считаем где палец относительно низа педали
    // (Bottom - ClientY) / Height
    let val = (target.bottom - touch.clientY) / target.height;
    
    // Ограничиваем от 0.0 до 1.0
    val = Math.max(0, Math.min(1, val));
    
    if (type === 'gas') setGas(val);
    if (type === 'brake') setBrake(val);
  };

  const resetPedal = (type) => {
    if (type === 'gas') setGas(0);
    if (type === 'brake') setBrake(0);
  };

  return (
    <div className="ui-overlay">
      <div className="vignette" />

      {/* КНОПКИ ЦЕНТРАЛЬНЫЕ */}
      <div className="btn-grp">
        <div className={`btn btn-start ${engineRunning ? 'on' : ''}`} onClick={toggleIgnition}>
           {engineRunning ? 'STOP' : 'START'}
        </div>
        <div className={`btn ${lights ? 'active' : ''}`} onClick={toggleLights}>
           LIGHTS
        </div>
        <div className={`btn ${nitroActive ? 'active' : ''}`} 
             onMouseDown={() => setNitro(true)} onMouseUp={() => setNitro(false)}
             onTouchStart={() => setNitro(true)} onTouchEnd={() => setNitro(false)}>
           NITRO
        </div>
      </div>

      <div className="dashboard">
        <div className={`cluster ${lights ? 'lit' : ''}`}>
           {/* ТАХОМЕТР */}
           <div className="gauge">
              <div className="gauge-val">{(rpm/1000).toFixed(1)}</div>
              <div className="gauge-label">RPM</div>
              <div className="needle" style={{ transform: `rotate(${rpmDeg}deg)` }} />
           </div>

           {/* ПЕРЕДАЧА */}
           <div className="info-box">
              <div style={{color:'#666', fontSize:'1.5vmin'}}>GEAR</div>
              <div className="gear-num">{gear}</div>
              <div style={{color: engineRunning ? '#fa0' : '#333', fontSize:'1.5vmin', marginTop:'1vmin'}}>TURBO</div>
           </div>

           {/* СПИДОМЕТР */}
           <div className="gauge">
              <div className="gauge-val">{Math.round(speed)}</div>
              <div className="gauge-label">KM/H</div>
              <div className="needle" style={{ transform: `rotate(${speedDeg}deg)`, background: '#fa0', boxShadow:'0 0 1vmin orange' }} />
           </div>
        </div>

        {/* ПЕДАЛИ */}
        <div className="controls-area">
          {/* ТОРМОЗ */}
          <div className="pedal-container">
            <div className="pedal"
                 onTouchStart={(e) => handleTouch(e, 'brake')}
                 onTouchMove={(e) => handleTouch(e, 'brake')}
                 onTouchEnd={() => resetPedal('brake')}>
               <div className="pedal-fill" style={{ height: `${brake * 100}%` }} />
            </div>
            <span style={{color:'#fff', fontSize:'1.5vmin', marginTop:'0.5vmin'}}>BRAKE</span>
          </div>

          {/* ГАЗ */}
          <div className="pedal-container">
            <div className="pedal"
                 onTouchStart={(e) => handleTouch(e, 'gas')}
                 onTouchMove={(e) => handleTouch(e, 'gas')}
                 onTouchEnd={() => resetPedal('gas')}>
               <div className="pedal-fill" style={{ height: `${gas * 100}%` }} />
            </div>
            <span style={{color:'#fff', fontSize:'1.5vmin', marginTop:'0.5vmin'}}>GAS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// EFFECTS & LOOP
const Effects = () => {
  const nitro = useStore(s => s.nitroActive);
  const offset = new THREE.Vector2(nitro ? 0.005 : 0, 0);
  return (
    <EffectComposer>
       <Bloom luminanceThreshold={0.6} intensity={1.2} />
       <ChromaticAberration offset={offset} />
    </EffectComposer>
  )
}
const Loop = () => {
  const update = useStore(s => s.updatePhysics);
  useFrame((_, dt) => update(dt));
  return null;
}

export default function App() {
  return (
    <>
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
           <Scene />
           <Loop />
           <Effects />
        </Canvas>
      </div>
      <Dashboard />
      <AudioEngine />
    </>
  );
}

