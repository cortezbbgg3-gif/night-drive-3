import React, { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import './overlay.css'; // Assume basic CSS

export function Overlay() {
  const { setGas, setBrake, isEngineOn, toggleEngine } = useStore();
  const [landscape, setLandscape] = useState(true);

  // Check orientation
  useEffect(() => {
    const check = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);

  // Spring Logic for pedals (Visual -> State)
  const handlePedal = (type, value) => {
    if (type === 'gas') setGas(parseFloat(value));
    if (type === 'brake') setBrake(parseFloat(value));
  };

  const handleRelease = (type, inputRef) => {
      // Simple animation loop to bring slider back to 0
      let val = parseFloat(inputRef.current.value);
      const animate = () => {
          val *= 0.85; // Spring damping
          if (val < 0.01) val = 0;
          inputRef.current.value = val;
          if (type === 'gas') setGas(val);
          if (type === 'brake') setBrake(val);
          
          if (val > 0) requestAnimationFrame(animate);
      };
      animate();
  };

  if (!landscape) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
        <h1>Поверните устройство / Rotate Device ↻</h1>
      </div>
    );
  }

  return (
    <div className="overlay-container">
        {!isEngineOn && (
            <button className="start-btn" onClick={toggleEngine}>
                START ENGINE
            </button>
        )}
        
        {isEngineOn && (
            <>
                <div className="pedal-container left">
                    <label>BRAKE</label>
                    <Pedal type="brake" onChange={handlePedal} onRelease={handleRelease} />
                </div>
                <div className="pedal-container right">
                    <label>GAS</label>
                    <Pedal type="gas" onChange={handlePedal} onRelease={handleRelease} />
                </div>
            </>
        )}
    </div>
  );
}

// Subcomponent for cleaner DOM logic
const Pedal = ({ type, onChange, onRelease }) => {
    const ref = useRef();
    return (
        <input 
            ref={ref}
            type="range" 
            min="0" max="1" step="0.01" defaultValue="0"
            className={`pedal-slider ${type}`}
            onInput={(e) => onChange(type, e.target.value)}
            onTouchEnd={() => onRelease(type, ref)}
            onMouseUp={() => onRelease(type, ref)}
        />
    )
}
