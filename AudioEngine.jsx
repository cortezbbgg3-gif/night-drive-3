import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, isCranking, isBroken, rpm, turbo, gas } = useStore();
  
  const ctx = useRef(null);
  const master = useRef(null);
  
  // --- NODES ---
  const nodes = useRef({
    rumbleOsc: null,    // Суб-бас (дрожь)
    exhaustNode: null,  // Шум выхлопа (Pink Noise)
    turboOsc: null,     // Свист
    starterOsc: null,   // Стартер
    blowOffNode: null,  // Сброс давления
    
    // Gains
    rumbleGain: null,
    exhaustGain: null,
    turboGain: null,
    starterGain: null,
    blowOffGain: null,
    
    // Filters
    exhaustFilter: null,
  });

  // Отслеживаем турбину для звука сброса (Blow-off)
  const prevTurbo = useRef(0);

  // --- ИНИЦИАЛИЗАЦИЯ ---
  useEffect(() => {
    const shouldBeOn = engineRunning || isCranking;
    
    if (shouldBeOn && !ctx.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx.current = new AudioContext();
      master.current = ctx.current.createGain();
      master.current.connect(ctx.current.destination);

      // 1. GENERATE NOISE BUFFER (Для выхлопа и стартера)
      const bufferSize = ctx.current.sampleRate * 2; // 2 секунды
      const buffer = ctx.current.createBuffer(1, bufferSize, ctx.current.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Pink Noise approximation
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
      }
      let lastOut = 0;

      // 2. RUMBLE (Бас)
      const rumble = ctx.current.createOscillator();
      rumble.type = 'sawtooth';
      const rGain = ctx.current.createGain();
      rumble.connect(rGain);
      rGain.connect(master.current);
      nodes.current.rumbleOsc = rumble;
      nodes.current.rumbleGain = rGain;
      rumble.start();

      // 3. EXHAUST (Шум)
      const exhaust = ctx.current.createBufferSource();
      exhaust.buffer = buffer;
      exhaust.loop = true;
      const exFilter = ctx.current.createBiquadFilter();
      exFilter.type = 'lowpass';
      const exGain = ctx.current.createGain();
      
      exhaust.connect(exFilter);
      exFilter.connect(exGain);
      exGain.connect(master.current);
      
      nodes.current.exhaustNode = exhaust;
      nodes.current.exhaustFilter = exFilter;
      nodes.current.exhaustGain = exGain;
      exhaust.start();

      // 4. TURBO
      const turb = ctx.current.createOscillator();
      turb.type = 'sine';
      const tGain = ctx.current.createGain();
      tGain.gain.value = 0;
      turb.connect(tGain);
      tGain.connect(master.current);
      nodes.current.turboOsc = turb;
      nodes.current.turboGain = tGain;
      turb.start();

      // 5. STARTER
      const startSrc = ctx.current.createBufferSource();
      startSrc.buffer = buffer;
      startSrc.loop = true;
      const sGain = ctx.current.createGain();
      sGain.gain.value = 0;
      // Bandpass для звука "кх-кх-кх"
      const sFilter = ctx.current.createBiquadFilter();
      sFilter.type = 'bandpass';
      sFilter.frequency.value = 200;
      
      startSrc.connect(sFilter);
      sFilter.connect(sGain);
      sGain.connect(master.current);
      
      nodes.current.starterOsc = startSrc;
      nodes.current.starterGain = sGain;
      startSrc.start();

      // 6. BLOW OFF
      const blow = ctx.current.createBufferSource();
      blow.buffer = buffer;
      blow.loop = true;
      const bGain = ctx.current.createGain();
      bGain.gain.value = 0;
      const bFilter = ctx.current.createBiquadFilter();
      bFilter.type = 'highpass';
      bFilter.frequency.value = 2000;
      
      blow.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(master.current);
      
      nodes.current.blowOffNode = blow;
      nodes.current.blowOffGain = bGain;
      blow.start();
      
    } else if (!shouldBeOn && ctx.current) {
        // Shutdown
        master.current.gain.setTargetAtTime(0, ctx.current.currentTime, 0.2);
        setTimeout(() => {
            if(ctx.current) { ctx.current.close(); ctx.current = null; }
        }, 200);
    }
  }, [engineRunning, isCranking]);

  // --- LOOP ОБНОВЛЕНИЯ ---
  useEffect(() => {
    if (ctx.current) {
        const now = ctx.current.currentTime;
        const n = nodes.current;

        // 1. STARTER LOGIC
        if (isCranking) {
            // Ритмичное изменение громкости (LFO)
            const crankRhythm = Math.sin(now * 20); // Скорость стартера
            const crankVol = (crankRhythm + 1) * 0.4; // 0..0.8
            n.starterGain.gain.setTargetAtTime(crankVol, now, 0.05);
            
            // Глушим двигатель
            n.rumbleGain.gain.setTargetAtTime(0, now, 0.1);
            n.exhaustGain.gain.setTargetAtTime(0, now, 0.1);
        } else {
            n.starterGain.gain.setTargetAtTime(0, now, 0.1);
        }

        // 2. ENGINE LOGIC
        if (engineRunning && !isBroken) {
            // RPM Base: 800 -> 8000
            const r = Math.max(800, rpm);
            
            // Rumble Pitch (Низкий тон)
            const rumbleFreq = r / 60 * 1.5; // ~40Hz at idle
            n.rumbleOsc.frequency.setTargetAtTime(rumbleFreq, now, 0.05);
            n.rumbleGain.gain.setTargetAtTime(0.5, now, 0.1);

            // Exhaust Filter (Открывается с оборотами)
            // Idle: 400Hz (глухо), Redline: 3000Hz (звонко)
            const filterFreq = 400 + (r / 8000) * 3000;
            n.exhaustFilter.frequency.setTargetAtTime(filterFreq, now, 0.1);
            
            // Exhaust Volume (под нагрузкой громче)
            const exVol = 0.3 + (gas * 0.4);
            n.exhaustGain.gain.setTargetAtTime(exVol, now, 0.1);

            // Turbo Whine
            const turboFreq = 2000 + (turbo * 10000);
            n.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.1);
            n.turboGain.gain.setTargetAtTime(turbo * 0.15, now, 0.1); // Свист тихий, но слышный

            // Blow-off Trigger
            // Если турбина была раскручена и газ бросили
            if (prevTurbo.current > 0.5 && turbo < prevTurbo.current - 0.05) {
                // PSHHHH!
                n.blowOffGain.gain.cancelScheduledValues(now);
                n.blowOffGain.gain.setValueAtTime(0.5, now);
                n.blowOffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            }
        } else if (isBroken) {
             // Тишина или шум пара (опционально)
             master.current.gain.setTargetAtTime(0, now, 0.1);
        }
        
        prevTurbo.current = turbo;
    }
  }, [rpm, turbo, gas, isCranking, engineRunning, isBroken]);

  return null;
}
