import React, { useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from './store';
import { Scene } from './Scene';
import { AudioEngine } from './AudioEngine';
import './styles.css';

// --- UI DASHBOARD (ИНТЕРФЕЙС) ---
const Dashboard = () => {
  // Достаем все данные из стора
  const { 
    rpm, speed, gear, temp, 
    engineRunning, lights, nitroActive, 
    gas, brake, 
    setGas, setBrake, setNitro, 
    toggleIgnition, toggleLights 
  } = useStore();
  
  // Углы поворота стрелок (-135 старт, +135 конец)
  const rpmDeg = -135 + (rpm / 8000) * 270;
  const speedDeg = -135 + (speed / 280) * 270;

  // --- ЛОГИКА АНАЛОГОВОЙ ПЕДАЛИ ---
  const handlePedalTouch = (e, type) => {
    // Предотвращаем скролл страницы при движении пальца по педали
    // (Хотя touch-action: none в CSS тоже помогает)
    if(e.cancelable) e.preventDefault(); 

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Считаем от низа педали (Bottom) вверх
    // 0% внизу, 100% вверху
    let val = (rect.bottom - touch.clientY) / rect.height;
    
    // Ограничиваем диапазон от 0.0 до 1.0
    val = Math.max(0, Math.min(1, val));
    
    if (type === 'gas') setGas(val);
    if (type === 'brake') setBrake(val);
  };

  const resetPedal = (type) => {
    if (type === 'gas') setGas(0);
    if (type === 'brake') setBrake(0);
  };

  // Определение цвета температуры
  let tempColor = '#0f0'; // Зеленый
  let tempAnim = 'none';
  if (temp > 100) tempColor = '#fa0'; // Оранжевый
  if (temp > 115) {
      tempColor = '#f00'; // Красный
      tempAnim = 'blink 0.2s infinite'; // Мигание (нужен @keyframes blink в css)
  }

  return (
    <div className="ui-overlay">
      <div className="vignette" />

      {/* ГРУППА КНОПОК (START / LIGHTS / NITRO) */}
      <div className="btn-grp">
        <div 
            className={`btn btn-start ${engineRunning ? 'on' : ''}`} 
            onClick={toggleIgnition}
        >
           {engineRunning ? 'STOP' : 'START'}
        </div>
        
        <div 
            className={`btn ${lights ? 'active' : ''}`} 
            onClick={toggleLights}
        >
           LIGHTS
        </div>
        
        <div 
            className={`btn ${nitroActive ? 'active' : ''}`} 
            // Обработчики для кнопки Нитро (пока держишь - работает)
            onMouseDown={() => setNitro(true)} 
            onMouseUp={() => setNitro(false)}
            onTouchStart={(e) => { e.preventDefault(); setNitro(true); }} 
            onTouchEnd={(e) => { e.preventDefault(); setNitro(false); }}
        >
           NITRO
        </div>
      </div>

      {/* ПРИБОРНАЯ ПАНЕЛЬ */}
      <div className="dashboard">
        <div className={`cluster ${lights ? 'lit' : ''}`}>
           
           {/* ТАХОМЕТР */}
           <div className="gauge">
              <div className="gauge-val">{(rpm/1000).toFixed(1)}</div>
              <div className="gauge-label">RPM</div>
              <div className="needle" style={{ transform: `rotate(${rpmDeg}deg)` }} />
           </div>

           {/* ЦЕНТРАЛЬНАЯ ИНФО (ПЕРЕДАЧА + ТЕМПЕРАТУРА) */}
           <div className="info-box">
              <div style={{color:'#666', fontSize:'1.5vmin', fontWeight:'bold'}}>GEAR</div>
              <div className="gear-num">{gear}</div>
              
              {/* Градусник */}
              <div style={{ 
                  marginTop:'1vmin', 
                  fontSize:'2vmin', 
                  fontWeight:'bold', 
                  color: tempColor,
                  animation: tempAnim,
                  textShadow: `0 0 1vmin ${tempColor}`
              }}>
                 {Math.round(temp)}°C
              </div>
           </div>

           {/* СПИДОМЕТР */}
           <div className="gauge">
              <div className="gauge-val">{Math.round(speed)}</div>
              <div className="gauge-label">KM/H</div>
              <div className="needle" style={{ transform: `rotate(${speedDeg}deg)`, background: '#fa0', boxShadow:'0 0 1vmin orange' }} />
           </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ: ПЕДАЛИ */}
        <div className="controls-area">
          
          {/* ТОРМОЗ */}
          <div className="pedal-container">
            <div className="pedal"
                 onTouchStart={(e) => handlePedalTouch(e, 'brake')}
                 onTouchMove={(e) => handlePedalTouch(e, 'brake')}
                 onTouchEnd={() => resetPedal('brake')}
            >
               {/* Визуальное заполнение педали */}
               <div className="pedal-fill" style={{ height: `${brake * 100}%` }} />
            </div>
            <span style={{color:'#fff', fontSize:'1.5vmin', marginTop:'0.5vmin', fontWeight:'bold'}}>BRAKE</span>
          </div>

          {/* ГАЗ */}
          <div className="pedal-container">
            <div className="pedal"
                 onTouchStart={(e) => handlePedalTouch(e, 'gas')}
                 onTouchMove={(e) => handlePedalTouch(e, 'gas')}
                 onTouchEnd={() => resetPedal('gas')}
            >
               <div className="pedal-fill" style={{ height: `${gas * 100}%` }} />
            </div>
            <span style={{color:'#fff', fontSize:'1.5vmin', marginTop:'0.5vmin', fontWeight:'bold'}}>GAS</span>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- POST-PROCESSING EFFECT ---
// Добавляет свечение (Bloom) и искажение (Aberration) при Нитро
const Effects = () => {
  const nitro = useStore(s => s.nitroActive);
  // Вектор смещения каналов (RGB Shift)
  const offset = new THREE.Vector2(nitro ? 0.005 : 0, 0);
  
  return (
    <EffectComposer>
       <Bloom luminanceThreshold={0.6} intensity={1.2} />
       <ChromaticAberration offset={offset} />
    </EffectComposer>
  )
}

// --- PHYSICS LOOP ---
// Этот компонент вызывает пересчет физики 60 раз в секунду
const Loop = () => {
  const updatePhysics = useStore(s => s.updatePhysics);
  useFrame((_, dt) => {
      updatePhysics(dt);
  });
  return null;
}

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <>
      <div className="canvas-container">
        {/* Камера отодвинута на z=5 и поднята на y=1.5, чтобы видеть дорогу */}
        <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
           <Scene />
           <Loop />
           <Effects />
        </Canvas>
      </div>
      
      {/* 2D Интерфейс поверх Canvas */}
      <Dashboard />
      
      {/* Невидимый звуковой движок */}
      <AudioEngine />
    </>
  );
}
