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
  const angle = -135 + (Math.min(value, max) / max) * 270;

  const renderTicks = () => {
    const ticks = [];
    const stepBig = type === 'rpm' ? 1000 : 20;
    const stepSmall = type === 'rpm' ? 250 : 10;
    const total = type === 'rpm' ? 8000 : 280;

    for (let i = 0; i <= total; i += stepSmall) {
        const pct = i / total;
        const deg = -135 + (pct * 270);
        const isBig = i % stepBig === 0;

        ticks.push(
            <div key={`t-${i}`} 
                 className={`tick-mark ${isBig ? 'big' : 'small'}`} 
                 style={{ transform: `rotate(${deg}deg)` }} 
            />
        );

        if (isBig) {
            const rad = (deg - 90) * (Math.PI / 180);
            const radius = 38; // Радиус цифр (%)
            const x = 50 + radius * Math.cos(rad);
            const y = 50 + radius * Math.sin(rad);
            ticks.push(
                <div key={`n-${i}`} className="tick-num" style={{ left: `${x}%`, top: `${y}%` }}>
                    {type === 'rpm' ? i/1000 : i}
                </div>
            );
        }
    }
    return ticks;
  };

  return (
    <div className="gauge-well">
        <div className="gauge-face">
            {renderTicks()}
            <div className="gauge-info">
                <div className="val-big">{type==='rpm' ? (value/1000).toFixed(1) : Math.round(value)}</div>
                <div className="val-label">{label}</div>
            </div>
            <div className="needle-container" style={{ transform: `rotate(${angle}deg)` }}>
                <div className={`needle ${type==='speed' ? 'orange' : ''}`} />
            </div>
            <div className="gauge-cap" />
        </div>
    </div>
  );
};

const Cockpit = () => {
  const { rpm, speed, gear, temp, msg, running, cranking, lights, nitro, gas, brake, setGas, setBrake, setNitro, toggleIgnition, toggleLights } = useStore();

  const handleTouch = (e, type) => {
     if(e.cancelable) e.preventDefault();
     const t = e.touches ? e.touches[0] : e;
     const rect = e.currentTarget.getBoundingClientRect();
     let val = (rect.bottom - t.clientY) / rect.height;
     val = Math.max(0, Math.min(1, val));
     if(type === 'gas') setGas(val);
     if(type === 'brake') setBrake(val);
  };
  const reset = (t) => { if(t==='gas') setGas(0); if(t==='brake') setBrake(0); };

  return (
    <div className="ui-layer">
        {/* ИНТЕРЬЕР (СТОЙКИ, КРЫША) */}
        <div className="interior-frame">
            <div className="pillar-left" />
            <div className="pillar-right" />
            <div className="roof-shade" />
        </div>

        {msg && <div className="warning-msg">{msg}</div>}

        <div className="dashboard-body">
            <div className="cluster-area">
                <Gauge value={rpm} max={8000} label="RPM" type="rpm" />

                <div className="center-stack">
                    <div className="gear-box">
                        <span className="gear-label">GEAR</span>
                        <span className="gear-num">{gear}</span>
                    </div>
                    <div className={`temp ${temp>115?'alert':''}`}>{Math.round(temp)}°C</div>
                    
                    <div className="btn-row">
                        <div className={`btn ${running?'on':''}`} onClick={toggleIgnition}>
                            {cranking ? '...' : 'START'}
                        </div>
                        <div className={`btn ${lights?'active':''}`} onClick={toggleLights}>LIGHT</div>
                        <div className={`btn nitro ${nitro?'active':''}`}
                             onMouseDown={()=>setNitro(true)} onMouseUp={()=>setNitro(false)}
                             onTouchStart={(e)=>{e.preventDefault();setNitro(true)}} 
                             onTouchEnd={(e)=>{e.preventDefault();setNitro(false)}}>
                             NITRO
                        </div>
                    </div>
                </div>

                <Gauge value={speed} max={280} label="KM/H" type="speed" />
            </div>

            <div className="pedals-area">
                <div className="pedal-box">
                    <div className="pedal" onTouchStart={(e)=>handleTouch(e,'brake')} onTouchMove={(e)=>handleTouch(e,'brake')} onTouchEnd={()=>reset('brake')}>
                        <div className="pedal-bar" style={{height:`${brake*100}%`}}/>
                    </div>
                    <div className="pedal-lbl">BRAKE</div>
                </div>
                <div className="pedal-box">
                    <div className="pedal" onTouchStart={(e)=>handleTouch(e,'gas')} onTouchMove={(e)=>handleTouch(e,'gas')} onTouchEnd={()=>reset('gas')}>
                        <div className="pedal-bar" style={{height:`${gas*100}%`}}/>
                    </div>
                    <div className="pedal-lbl">GAS</div>
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
        <Canvas camera={{ position: [0, 1.3, 5], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
           <Scene />
           <PhysicsSystem />
           <EffectComposer disableNormalPass>
               <Bloom luminanceThreshold={0.5} intensity={1.5} />
               <Noise opacity={0.08} />
           </EffectComposer>
        </Canvas>
      </div>
      <Cockpit />
      <AudioEngine />
    </>
  );
}

