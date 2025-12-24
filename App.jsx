import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// Компонент обновления физики (работает внутри Canvas)
const PhysicsSystem = () => {
    const update = useStore(s => s.updatePhysics);
    useFrame((_, dt) => {
        // Защита от лагов (dt не больше 0.1с)
        update(Math.min(dt, 0.1));
    });
    return null;
}

const Cockpit = () => {
  const { 
    rpm, speed, gear, temp, msg, 
    engineRunning, isCranking, lights, nitroActive,
    gas, brake,
    setGas, setBrake, setNitro, 
    toggleIgnition, toggleLights 
  } = useStore();

  // Лимиты углов для стрелок
  const rotRPM = Math.max(-120, Math.min(120, -120 + (rpm / 8000) * 240));
  const rotSpeed = Math.max(-120, Math.min(120, -120 + (speed / 260) * 240));

  // Хендлер для педалей
  const handleTouch = (e, type) => {
     if (e.cancelable) e.preventDefault();
     const t = e.touches ? e.touches[0] : e;
     const rect = e.currentTarget.getBoundingClientRect();
     // 0 внизу, 1 вверху
     let val = (rect.bottom - t.clientY) / rect.height;
     val = Math.max(0, Math.min(1, val));
     
     if (type === 'gas') setGas(val);
     if (type === 'brake') setBrake(val);
  };

  const reset = (type) => { 
      if (type === 'gas') setGas(0);
      if (type === 'brake') setBrake(0);
  };

  return (
    <div className="cabin-layer">
        <div className="windshield-frame" />

        {/* СООБЩЕНИЯ СИСТЕМЫ */}
        {msg && <div className="system-msg">{msg}</div>}

        <div className="dashboard-body">
            {/* ПРИБОРНАЯ ДОСКА */}
            <div className="cluster-hood">
                {/* ТАХОМЕТР */}
                <div className="gauge-well">
                    <div className={`gauge-face ${lights ? 'lit' : ''}`}>
                        <div className="ticks-rpm" />
                        <div className="label">RPM</div>
                        <div className="val-display">{(rpm/1000).toFixed(1)}</div>
                        <div className="needle" style={{ transform: `rotate(${rotRPM}deg)` }} />
                        <div className="gauge-glass" />
                    </div>
                </div>

                {/* ЦЕНТР */}
                <div className="center-stack">
                    <div className="digital-readout">
                        <span className="gear-big">{gear}</span>
                        <span className={`temp-label ${temp > 115 ? 'warning' : ''}`}>
                            {Math.round(temp)}°C
                        </span>
                    </div>
                    <div className="switch-row">
                        <button className={`car-btn ${engineRunning || isCranking ? 'on' : ''}`} 
                                onClick={toggleIgnition}>
                                {isCranking ? '...' : 'START'}
                        </button>
                        <button className={`car-btn ${lights ? 'active' : ''}`} 
                                onClick={toggleLights}>
                                LIGHT
                        </button>
                        <button className={`car-btn nitro ${nitroActive ? 'active' : ''}`}
                                onMouseDown={()=>setNitro(true)} onMouseUp={()=>setNitro(false)}
                                onTouchStart={(e)=>{e.preventDefault(); setNitro(true)}} 
                                onTouchEnd={(e)=>{e.preventDefault(); setNitro(false)}}>
                                NITRO
                        </button>
                    </div>
                </div>

                {/* СПИДОМЕТР */}
                <div className="gauge-well">
                    <div className={`gauge-face ${lights ? 'lit' : ''}`}>
                        <div className="ticks-speed" />
                        <div className="label">KM/H</div>
                        <div className="val-display">{Math.round(speed)}</div>
                        <div className="needle orange" style={{ transform: `rotate(${rotSpeed}deg)` }} />
                        <div className="gauge-glass" />
                    </div>
                </div>
            </div>

            {/* ПЕДАЛИ */}
            <div className="controls">
                <div className="pedal-box">
                    <div className="pedal"
                         onTouchStart={(e)=>handleTouch(e,'brake')}
                         onTouchMove={(e)=>handleTouch(e,'brake')}
                         onTouchEnd={()=>reset('brake')}>
                         <div className="pedal-pressure" style={{ height: `${brake * 100}%` }} />
                         <div className="pedal-tread" />
                    </div>
                    <div className="pedal-label">BRAKE</div>
                </div>

                <div className="pedal-box">
                    <div className="pedal"
                         onTouchStart={(e)=>handleTouch(e,'gas')}
                         onTouchMove={(e)=>handleTouch(e,'gas')}
                         onTouchEnd={()=>reset('gas')}>
                         <div className="pedal-pressure" style={{ height: `${gas * 100}%` }} />
                         <div className="pedal-tread" />
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
      <div className="world-layer">
        <Canvas camera={{ position: [0, 1.4, 5], fov: 45 }} dpr={[1, 1.5]}>
           <Scene />
           <PhysicsSystem />
           <EffectComposer disableNormalPass>
               <Bloom luminanceThreshold={0.5} intensity={1.5} mipmapBlur />
               <Noise opacity={0.06} />
           </EffectComposer>
        </Canvas>
      </div>

      <Cockpit />
      <AudioEngine />
    </>
  );
}

