import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm, nitroActive } = useStore();
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const nitroOscRef = useRef(null);
  const nitroGainRef = useRef(null);

  useEffect(() => {
    if (engineRunning && !ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();

      // ENGINE SOUND (Low rumble)
      oscRef.current = ctxRef.current.createOscillator();
      gainRef.current = ctxRef.current.createGain();
      
      oscRef.current.type = 'sawtooth';
      
      // Lowpass filter (Muffle)
      const filter = ctxRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      oscRef.current.connect(filter);
      filter.connect(gainRef.current);
      gainRef.current.connect(ctxRef.current.destination);
      oscRef.current.start();

      // NITRO SOUND (High pitch whine)
      nitroOscRef.current = ctxRef.current.createOscillator();
      nitroGainRef.current = ctxRef.current.createGain();
      nitroOscRef.current.type = 'sine';
      nitroOscRef.current.frequency.value = 1000;
      nitroOscRef.current.connect(nitroGainRef.current);
      nitroGainRef.current.connect(ctxRef.current.destination);
      nitroOscRef.current.start();
      nitroGainRef.current.gain.value = 0;

    } else if (!engineRunning && ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, [engineRunning]);

  useEffect(() => {
    if (ctxRef.current && engineRunning) {
      // Engine Pitch
      const pitch = 50 + (rpm / 8000) * 350;
      oscRef.current.frequency.setTargetAtTime(pitch, ctxRef.current.currentTime, 0.1);
      
      // Engine Volume (Rumble)
      const vol = 0.2 + (rpm / 8000) * 0.1;
      gainRef.current.gain.setTargetAtTime(vol, ctxRef.current.currentTime, 0.1);

      // Nitro Sound
      if (nitroActive) {
          nitroGainRef.current.gain.setTargetAtTime(0.1, ctxRef.current.currentTime, 0.2);
          nitroOscRef.current.frequency.setTargetAtTime(2000 + (rpm/10), ctxRef.current.currentTime, 0.5);
      } else {
          nitroGainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.2);
      }
    }
  }, [rpm, nitroActive, engineRunning]);

  return null;
}

