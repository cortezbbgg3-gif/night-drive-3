import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

const PhysicsSystem = () => {
  const update = useStore(s => s.updatePhysics);
  useFrame((_, dt) => update(Math.min(dt, 0.1)));
  return null;
}

const Gauge = ({ value, max, label, type }) => {
  // Расчет угла для стрелки (-135 до +135)
  const angle = -135 + (Math.min(value, max) / max) * 270;
  
  // Генерация рисок и цифр
  const renderTicks = () => {
    const ticks = [];
    const step = type === 'rpm' ? 1000 : 20; // Шаг цифр
    const total = type === 'rpm' ? 8000 : 280;
    
    for (let i = 0; i <= total; i += step) {
        // Процент от круга (0..1) для диапазона 270 градусов
        const pct = i / total;
        const deg = -135 + (pct * 270);
        // Радианы для позиции (с поправкой -90deg т.к. 0 это верх)
        const rad = (deg - 90) * (Math.PI / 180);
        
        // Позиция цифры
        const rText = 55; // Радиус текста %
        const tx = 50 + rText * Math.cos(rad);
        const ty = 50 + rText * Math.sin(rad);

        // Риска (палочка) - используем transform rotate
        const isMajor = true;
        
        ticks.push(
            <React.Fragment key={i}>
                {/* Палочка */}
                <div className="tick-mark" style={{ transform: `rotate(${deg}deg)` }} />
                {/* Цифра */}
                <div className="tick-num" style={{ left: `${tx}%`, top: `${ty}%` }}>
                    {type === 'rpm' ? i/1000 : i}
                </div>
            </React.Fragment>
        );
    }
    return ticks;
  };

  return (
    <div className="gauge-well">
        <div className="gauge-face">
            {renderTicks()}
            <div className="gauge-info">
                <div className="val-big">{type === 'rpm' ? (value/1000).toFixed(1) : Math.round(value)}</div>
                <div className="val-label">{label}</div>
            </div>
            {/* Стрелка */}
            <div className="needle-container" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="needle-arm" />
            </div>
            <div className="gauge-cap" />
        </div>
    </div>
  );
};

const Cockpit = () => {
  const { 
    rpm, speed, gear, temp, msg,
    running, cranking, lights, nitro,
    gas, brake,
    setGas, setBrake, setNitro, 
    toggleIgnition, toggleLights 
  } = useStore();

  const handleTouch = (e, type) => {
     if(e.cancelable) e.preventDefault();
     const t = e.touches ? e.touches[0] : e;
     const rect = e.currentTarget.getBoundingClientRect();
     let val = (rect.bottom - t.clientY) / rect.height;
     val = Math.max(0, Math.min(1, val));
     if (type === 'gas') setGas(val);
     if (type === 'brake') setBrake(val);
  };

  const reset = (t) => { if(t==='gas') setGas(0); if(t==='brake') setBrake(0); };

  return (
    <div className="ui-layer">
        <div className="vignette-frame" />
        
        {msg && <div className="warning-msg">{msg}</div>}

        <div className="dashboard-wrapper">
            <div className="gauges-row">
                {/* RPM */}
                <Gauge value={rpm} max={8000} label="RPM" type="rpm" />

                {/* CENTER */}
                <div className="center-console">
                    <div className="gear-display">
                        <span className="gear-label">GEAR</span>
                        <span className="gear-num">{gear}</span>
                    </div>
                    <div className={`temp-display ${temp > 110 ? 'alert' : ''}`}>
                        {Math.round(temp)}°C
                    </div>
                    
                    <div className="buttons-row">
                        <button className={`btn ${running ? 'on' : ''}`} onClick={toggleIgnition}>
                            {cranking ? '...' : 'START'}
                        </button>
                        <button className={`btn ${lights ? 'active' : ''}`} onClick={toggleLights}>
                            LIGHT
                        </button>
                        <button className={`btn nitro ${nitro ? 'active' : ''}`}
                            onTouchStart={()=>setNitro(true)} onTouchEnd={()=>setNitro(false)}
                            onMouseDown={()=>setNitro(true)} onMouseUp={()=>setNitro(false)}>
                            NITRO
                        </button>
                    </div>
                </div>

                {/* SPEED */}
                <Gauge value={speed} max={280} label="KM/H" type="speed" />
            </div>

            {/* PEDALS */}
            <div className="pedals-row">
                <div className="pedal brake" 
                     onTouchStart={(e)=>handleTouch(e,'brake')} 
                     onTouchMove={(e)=>handleTouch(e,'brake')} 
                     onTouchEnd={()=>reset('brake')}>
                     <div className="pedal-bar" style={{height: `${brake*100}%`}}/>
                     <span>BRAKE</span>
                </div>
                <div className="pedal gas"
                     onTouchStart={(e)=>handleTouch(e,'gas')} 
                     onTouchMove={(e)=>handleTouch(e,'gas')} 
                     onTouchEnd={()=>reset('gas')}>
                     <div className="pedal-bar" style={{height: `${gas*100}%`}}/>
                     <span>GAS</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default function App() {
  return (
    <>
      <div id="scene-root">
        <Canvas camera={{ position: [0, 1.4, 5], fov: 45 }} dpr={[1, 1.5]}>
           <Scene />
           <EffectComposer disableNormalPass>
               <Bloom luminanceThreshold={0.5} intensity={1.2} />
               <Noise opacity={0.08} />
           </EffectComposer>
        </Canvas>
      </div>
      <Cockpit />
      <AudioEngine />
    </>
  );
}

