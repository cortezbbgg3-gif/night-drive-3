import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm, gas, turboPressure, isStalling } = useStore();
  
  const ctx = useRef(null);
  
  // Nodes
  const masterGain = useRef(null);
  const oscLow = useRef(null); // Низкий бас
  const oscHigh = useRef(null); // Высокий рык
  const noiseNode = useRef(null); // Шум воздуха
  const turboOsc = useRef(null); // Свист турбины
  
  // State tracking for "Blow-off" sound
  const prevTurbo = useRef(0);

  // Инициализация
  useEffect(() => {
    if (engineRunning && !ctx.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx.current = new AudioCtx();
      masterGain.current = ctx.current.createGain();
      masterGain.current.connect(ctx.current.destination);

      // 1. ENGINE RUMBLE (Sawtooth + Distortion)
      oscLow.current = ctx.current.createOscillator();
      oscLow.current.type = 'sawtooth';
      
      oscHigh.current = ctx.current.createOscillator();
      oscHigh.current.type = 'square'; // Квадрат для агрессии

      // Filter
      const filter = ctx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      // Distortion
      const shaper = ctx.current.createWaveShaper();
      shaper.curve = makeDistortionCurve(100);

      // Connect logic
      const engineMix = ctx.current.createGain();
      engineMix.gain.value = 0.4;
      
      oscLow.current.connect(filter);
      oscHigh.current.connect(filter);
      filter.connect(shaper);
      shaper.connect(engineMix);
      engineMix.connect(masterGain.current);

      oscLow.current.start();
      oscHigh.current.start();
      
      // Store references on node for easier access later if needed
      oscLow.current.filterNode = filter;

      // 2. TURBO WHINE (Sine wave high pitch)
      turboOsc.current = ctx.current.createOscillator();
      turboOsc.current.type = 'sine';
      const turboGain = ctx.current.createGain();
      turboGain.gain.value = 0;
      turboOsc.current.nodeGain = turboGain; // Save ref
      
      turboOsc.current.connect(turboGain);
      turboGain.connect(masterGain.current);
      turboOsc.current.start();
      
      // 3. AIR INTAKE / BLOW OFF (Noise buffer)
      const bufferSize = ctx.current.sampleRate * 2;
      const buffer = ctx.current.createBuffer(1, bufferSize, ctx.current.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      
      noiseNode.current = ctx.current.createBufferSource();
      noiseNode.current.buffer = buffer;
      noiseNode.current.loop = true;
      const noiseGain = ctx.current.createGain();
      noiseGain.gain.value = 0;
      noiseNode.current.nodeGain = noiseGain; // Save ref
      
      noiseNode.current.connect(noiseGain);
      noiseGain.connect(masterGain.current);
      noiseNode.current.start();

    } else if (!engineRunning && ctx.current) {
        // Stop sound
        masterGain.current.gain.linearRampToValueAtTime(0, ctx.current.currentTime + 0.2);
        setTimeout(() => {
            if(ctx.current) { ctx.current.close(); ctx.current = null; }
        }, 200);
    }
  }, [engineRunning]);

  // Update Loop
  useEffect(() => {
    if (ctx.current && engineRunning) {
        const now = ctx.current.currentTime;
        
        // --- 1. ENGINE TONE ---
        // Если глохнет (isStalling) - звук дергается
        const jitter = isStalling ? (Math.random() * 0.5) : 1;
        
        const baseFreq = 40 + (rpm / 8000) * 300;
        oscLow.current.frequency.setTargetAtTime(baseFreq * jitter, now, 0.05);
        oscHigh.current.frequency.setTargetAtTime(baseFreq * 1.5 * jitter, now, 0.05);
        
        // Фильтр открывается с оборотами
        const filterFreq = 300 + (rpm / 8000) * 4000;
        oscLow.current.filterNode.frequency.setTargetAtTime(filterFreq, now, 0.1);
        
        // --- 2. TURBO LOGIC ---
        // Свист
        if (turboOsc.current.nodeGain) {
            const vol = turboPressure * 0.15; // Громкость свиста
            turboOsc.current.nodeGain.gain.setTargetAtTime(vol, now, 0.1);
            turboOsc.current.frequency.setTargetAtTime(1000 + turboPressure * 6000, now, 0.1);
        }

        // --- 3. BLOW OFF (ПШИК) ---
        // Если давление турбины резко упало (сбросили газ или переключили передачу)
        if (prevTurbo.current > 0.5 && turboPressure < 0.4) {
            // Trigger PSHHH
            if (noiseNode.current.nodeGain) {
                noiseNode.current.nodeGain.gain.cancelScheduledValues(now);
                noiseNode.current.nodeGain.gain.setValueAtTime(0.4, now);
                noiseNode.current.nodeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            }
        }
        prevTurbo.current = turboPressure;

        // Если глохнет - громкость прыгает
        if (isStalling) {
            masterGain.current.gain.setTargetAtTime(Math.random() > 0.5 ? 0.5 : 0.1, now, 0.05);
        } else {
            masterGain.current.gain.setTargetAtTime(0.5, now, 0.1);
        }
    }
  }, [rpm, turboPressure, isStalling, engineRunning]);

  return null;
}

// Утилита искажения звука
function makeDistortionCurve(amount) {
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

