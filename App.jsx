import React, { useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- ИНТЕРФЕЙС ПРИБОРКИ ---
const DashboardUI = () => {
  const { rpm, speed, gear, engineRunning, lights, nitroActive, gasPressure, brakePressure, setGas, setBrake, setNitro, toggleIgnition, toggleLights } = useStore();
  
  // Вращение стрелок
  const rpmAngle = -135 + (rpm / 8000) * 270;
  const speedAngle = -135 + (speed / 260) * 270;

  // Логика педалей (плавное нажатие)
  const [gasHeld, setGasHeld] = useState(false);
  const [brakeHeld, setBrakeHeld] = useState(false);

  // Цикл обновления давления педалей
  useEffect(() => {
    let interval;
    const updatePedals = () => {
        // ГАЗ
        let g = useStore.getState().gasPressure;
        if (gasHeld) g = Math.min(1, g + 0.05); // Нарастает
        else g = Math.max(0, g - 0.1); // Спадает (пружина)
        setGas(g);

        // ТОРМОЗ
        let b = useStore.getState().brakePressure;
        if (brakeHeld) b = Math.min(1, b + 0.05);
        else b = Math.max(0, b - 0.1);
        setBrake(b);

        requestAnimationFrame(updatePedals);
    };
    interval = requestAnimationFrame(updatePedals);
    return () => cancelAnimationFrame(interval);
  }, [gasHeld, brakeHeld]);

  return (
    <div className="ui-overlay">
      <div className="windshield-vignette" />
      
      <div className="dashboard">
        {/* ЛЕВЫЙ БЛОК (ТАХОМЕТР) */}
        <div className={`cluster ${lights ? 'lit' : ''}`}>
           <div className="gauge">
              <div className="label-text">RPM x1000</div>
              <div className="value-text">{(rpm/1000).toFixed(1)}</div>
              <div className="needle" style={{ transform: `rotate(${rpmAngle}deg)` }} />
           </div>

           {/* ЦЕНТР (ПЕРЕДАЧА) */}
           <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ color:'#555', fontSize:'12px', fontWeight:'bold' }}>GEAR</div>
              <div className="gear-disp">{gear}</div>
              <div className="value-text" style={{ fontSize:'14px', marginTop:'10px' }}>TEMP: 90°</div>
           </div>

           {/* ПРАВЫЙ БЛОК (СПИДОМЕТР) */}
           <div className="gauge">
              <div className="label-text">KM/H</div>
              <div className="value-text">{Math.round(speed)}</div>
              <div className="needle" style={{ transform: `rotate(${speedAngle}deg)`, background: '#ff9d00', boxShadow: '0 0 5px orange' }} />
           </div>
        </div>

        {/* НИЖНИЙ РЯД (УПРАВЛЕНИЕ) */}
        <div className="controls-row">
            {/* ТОРМОЗ */}
            <div className="pedal-group">
                <div className="pedal"
                     onMouseDown={() => setBrakeHeld(true)} onMouseUp={() => setBrakeHeld(false)}
                     onTouchStart={() => setBrakeHeld(true)} onTouchEnd={() => setBrakeHeld(false)}
                >
                    <div className="pedal-fill" style={{ height: `${brakePressure * 100}%` }} />
                </div>
                <span style={{color:'white', fontWeight:'bold'}}>BRAKE</span>
            </div>

            {/* ЦЕНТРАЛЬНЫЕ КНОПКИ */}
            <div style={{ display:'flex', gap:'15px', paddingBottom:'20px' }}>
                <div className={`btn-round ${engineRunning ? 'active' : ''}`} onClick={toggleIgnition} style={{ borderColor: engineRunning ? '#0f0' : '#555' }}>
                    START<br/>STOP
                </div>
                <div className={`btn-round ${lights ? 'active' : ''}`} onClick={toggleLights} style={{ borderColor: lights ? '#ffaa00' : '#555' }}>
                    LIGHTS
                </div>
                <div className={`btn-round btn-nitro ${nitroActive ? 'active' : ''}`} 
                     onMouseDown={() => setNitro(true)} onMouseUp={() => setNitro(false)}
                     onTouchStart={() => setNitro(true)} onTouchEnd={() => setNitro(false)}
                >
                    NITRO
                </div>
            </div>

            {/* ГАЗ */}
            <div className="pedal-group">
                <div className="pedal"
                     onMouseDown={() => setGasHeld(true)} onMouseUp={() => setGasHeld(false)}
                     onTouchStart={() => setGasHeld(true)} onTouchEnd={() => setGasHeld(false)}
                >
                    <div className="pedal-fill" style={{ height: `${gasPressure * 100}%` }} />
                </div>
                <span style={{color:'white', fontWeight:'bold'}}>GAS</span>
            </div>
        </div>
      </div>
    </div>
  );
};

// ФИЗИЧЕСКИЙ ЛУП
const PhysicsLoop = () => {
    const update = useStore(s => s.updatePhysics);
    useFrame((_, dt) => update(dt));
    return null;
}

// ПОСТ-ОБРАБОТКА (ЭФФЕКТ СКОРОСТИ)
const Effects = () => {
    const nitro = useStore(s => s.nitroActive);
    const speed = useStore(s => s.speed);
    // Смещение цветов при нитро
    const offset = new THREE.Vector2(nitro ? 0.005 : 0, nitro ? 0.005 : 0);
    
    return (
        <EffectComposer>
            <Bloom luminanceThreshold={0.5} intensity={1.5} />
            <ChromaticAberration offset={offset} /> 
        </EffectComposer>
    )
}

export default function App() {
  return (
    <>
      <div className="canvas-container">
          <Canvas camera={{ position: [0, 1.5, 4], fov: 60 }}>
            <Scene />
            <PhysicsLoop />
            <Effects />
          </Canvas>
      </div>
      <DashboardUI />
      <AudioEngine />
    </>
  );
}

