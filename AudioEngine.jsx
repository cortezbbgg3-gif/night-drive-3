import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm, gas, nitroActive } = useStore();
  
  const ctx = useRef(null);
  const engineOsc = useRef(null);
  const engineGain = useRef(null);
  
  // TURBO SOUND NODES
  const turboOsc = useRef(null);
  const turboGain = useRef(null);
  const turboFilter = useRef(null);

  useEffect(() => {
    if (engineRunning && !ctx.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx.current = new AudioCtx();

      // --- ENGINE RUMBLE ---
      engineOsc.current = ctx.current.createOscillator();
      engineOsc.current.type = 'sawtooth';
      engineGain.current = ctx.current.createGain();
      
      // Lowpass чтобы звук был басистым
      const filter = ctx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      engineOsc.current.connect(filter);
      filter.connect(engineGain.current);
      engineGain.current.connect(ctx.current.destination);
      engineOsc.current.start();

      // --- TURBO WHINE (СВИСТ) ---
      turboOsc.current = ctx.current.createOscillator();
      turboOsc.current.type = 'sine'; // Чистый тон свиста
      turboGain.current = ctx.current.createGain();
      turboGain.current.gain.value = 0;
      
      // Фильтр чтобы свист был мягким
      turboFilter.current = ctx.current.createBiquadFilter();
      turboFilter.current.type = 'bandpass';
      turboFilter.current.Q.value = 1;

      turboOsc.current.connect(turboFilter.current);
      turboFilter.current.connect(turboGain.current);
      turboGain.current.connect(ctx.current.destination);
      turboOsc.current.start();

    } else if (!engineRunning && ctx.current) {
      ctx.current.close();
      ctx.current = null;
    }
  }, [engineRunning]);

  useEffect(() => {
    if (ctx.current && engineRunning) {
      const now = ctx.current.currentTime;
      
      // 1. ENGINE UPDATE
      // Pitch: 60Hz (idle) -> 400Hz (redline)
      const pitch = 60 + (rpm / 8000) * 340;
      engineOsc.current.frequency.setTargetAtTime(pitch, now, 0.1);
      
      // Rumble Volume: дрожит
      const rumble = 0.3 + (Math.random() * 0.1);
      engineGain.current.gain.setTargetAtTime(rumble, now, 0.1);

      // 2. TURBO UPDATE
      // Свист слышен если газ нажат и обороты выше 2000
      let turboVol = 0;
      if (rpm > 2000 && gas > 0.4) {
          turboVol = (gas * 0.3) + (nitroActive ? 0.2 : 0);
      }
      turboGain.current.gain.setTargetAtTime(turboVol, now, 0.2);
      
      // Частота свиста (от 1000Hz до 6000Hz)
      const turboFreq = 1000 + (rpm / 8000) * 5000;
      turboOsc.current.frequency.setTargetAtTime(turboFreq, now, 0.1);
    }
  }, [rpm, gas, nitroActive, engineRunning]);

  return null;
}

