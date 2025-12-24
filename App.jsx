import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- КОМПОНЕНТ ФИЗИКИ (Внутри Canvas) ---
const PhysicsLoop = () => {
  const updatePhysics = useStore(s => s.updatePhysics);
  useFrame((_, dt) => {
    // Ограничиваем dt, чтобы физика не сходила с ума при лагах
    const safeDt = Math.min(dt, 0.1); 
    updatePhysics(safeDt);
  });
  return null;
}

// --- КОМПОНЕНТ ИНТЕРФЕЙСА (DASHBOARD) ---
const Cockpit = () => {
  const { 
    rpm, speed, gear, temp, 
    engineRunning, lights, nitroActive, 
    gas, brake, 
    setGas, setBrake, setNitro, 
    toggleIgnition, toggleLights 
  } = useStore();

  // Лимиты вращения стрелок (CSS degrees)
  // -120 (0) до +120 (Max)
  const rpmDeg = -120 + (rpm / 8000) * 240;
  const speedDeg = -120 + (speed / 240) * 240;

  // Обработчик слайдера педалей
  const handlePedal = (e, type) => {
    if(e.cancelable) e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Вычисляем нажатие снизу вверх (0% -> 100%)
    let val = (rect.bottom - touch.clientY) / rect.height;
    val = Math.max(0, Math.min(1, val));
    
    if (type === 'gas') setGas(val);
    if (type === 'brake') setBrake(val);
  };

  const releasePedal = (type) => {
    if (type === 'gas') setGas(0);
    if (type === 'brake') setBrake(0);
  };

  return (
    <div className="cockpit-overlay">
      
      {/* 1. РАМКА ЛОБОВОГО СТЕКЛА (Интерьер) */}
      <div className="windshield-frame">
          <div className="pillar-left" />
          <div className="pillar-right" />
          <div className="dashboard-top" />
      </div>

      {/* 2. ПРИБОРНАЯ ПАНЕЛЬ */}
      <div className="dashboard-body">
        
        {/* Козырек приборов */}
        <div className="cluster-hood">
            
            {/* ТАХОМЕТР */}
            <div className="gauge-well">
                <div className={`gauge-face ${lights ? 'lit' : ''}`}>
                    <div className="ticks-rpm" />
                    <div className="gauge-label">RPM</div>
                    <div className="gauge-value">{(rpm/1000).toFixed(1)}</div>
                    {/* Стрелка */}
                    <div className="needle-container" style={{ transform: `rotate(${rpmDeg}deg)` }}>
                        <div className="needle" />
                        <div className="needle-glow" />
                    </div>
                    {/* Стекло с бликом */}
                    <div className="gauge-glass" />
                </div>
            </div>

            {/* ЦЕНТРАЛЬНАЯ КОНСОЛЬ */}
            <div className="center-stack">
                <div className="digital-readout">
                    <span className="gear-label">GEAR</span>
                    <span className="gear-big">{gear}</span>
                    <span className={`temp-label ${temp > 110 ? 'warning' : ''}`}>
                        {Math.round(temp)}°C
                    </span>
                </div>

                <div className="switch-row">
                    <button className={`car-btn ${engineRunning ? 'on' : ''}`} onClick={toggleIgnition}>
                        ENGINE
                    </button>
                    <button className={`car-btn ${lights ? 'active' : ''}`} onClick={toggleLights}>
                        LIGHTS
                    </button>
                    <button 
                        className={`car-btn nitro ${nitroActive ? 'active' : ''}`}
                        onMouseDown={() => setNitro(true)} onMouseUp={() => setNitro(false)}
                        onTouchStart={() => setNitro(true)} onTouchEnd={() => setNitro(false)}
                    >
                        NITRO
                    </button>
                </div>
            </div>

            {/* СПИДОМЕТР */}
            <div className="gauge-well">
                <div className={`gauge-face ${lights ? 'lit' : ''}`}>
                    <div className="ticks-speed" />
                    <div className="gauge-label">KM/H</div>
                    <div className="gauge-value">{Math.round(speed)}</div>
                    
                    <div className="needle-container" style={{ transform: `rotate(${speedDeg}deg)` }}>
                        <div className="needle orange" />
                        <div className="needle-glow orange" />
                    </div>
                    <div className="gauge-glass" />
                </div>
            </div>
        </div>

        {/* 3. ПЕДАЛИ (Слайдеры) */}
        <div className="pedals-area">
            {/* Тормоз */}
            <div className="pedal-box">
                <div className="pedal brake"
                     onTouchStart={(e) => handlePedal(e, 'brake')}
                     onTouchMove={(e) => handlePedal(e, 'brake')}
                     onTouchEnd={() => releasePedal('brake')}
                >
                    <div className="pedal-tread" />
                    {/* Индикатор нажатия */}
                    <div className="pedal-pressure" style={{ height: `${brake * 100}%` }} />
                </div>
                <div className="pedal-label">BRAKE</div>
            </div>

            {/* Газ */}
            <div className="pedal-box">
                <div className="pedal gas"
                     onTouchStart={(e) => handlePedal(e, 'gas')}
                     onTouchMove={(e) => handlePedal(e, 'gas')}
                     onTouchEnd={() => releasePedal('gas')}
                >
                    <div className="pedal-tread" />
                    <div className="pedal-pressure" style={{ height: `${gas * 100}%` }} />
                </div>
                <div className="pedal-label">GAS</div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default function App() {
  return (
    <>
      <div id="canvas-container">
        <Canvas camera={{ position: [0, 1.4, 5], fov: 45 }} dpr={[1, 1.5]}>
           {/* Сцена (Дорога, мир) */}
           <Scene />
           
           {/* Пост-обработка (Bloom для фар и фонарей) */}
           <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={0.5} intensity={1.5} mipmapBlur />
              <Noise opacity={0.05} />
              <Vignette eskil={false} offset={0.1} darkness={1.1} />
           </EffectComposer>

           {/* Физика */}
           <PhysicsLoop />
        </Canvas>
      </div>

      {/* Интерфейс */}
      <Cockpit />
      
      {/* Звук */}
      <AudioEngine />
    </>
  );
}

