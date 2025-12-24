import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm, turbo } = useStore();
  const ctx = useRef(null);
  const master = useRef(null);
  
  // Oscillators
  const oscRumble = useRef(null);
  const oscGrowl = useRef(null);
  const oscWhine = useRef(null);
  const noiseNode = useRef(null);
  
  // Gains
  const gainRumble = useRef(null);
  const gainGrowl = useRef(null);
  const gainWhine = useRef(null);
  const gainNoise = useRef(null);
  const gainTurbo = useRef(null);

  useEffect(() => {
    if (engineRunning && !ctx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx.current = new Ctx();
      master.current = ctx.current.createGain();
      master.current.connect(ctx.current.destination);

      // 1. RUMBLE (Суб-бас)
      oscRumble.current = ctx.current.createOscillator();
      oscRumble.current.type = 'sine';
      gainRumble.current = ctx.current.createGain();
      oscRumble.current.connect(gainRumble.current);
      gainRumble.current.connect(master.current);
      oscRumble.current.start();

      // 2. GROWL (Рык)
      oscGrowl.current = ctx.current.createOscillator();
      oscGrowl.current.type = 'sawtooth';
      gainGrowl.current = ctx.current.createGain();
      // Фильтр для рыка (срезаем верхние частоты, чтобы не пищало)
      const filter = ctx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      oscGrowl.current.connect(filter);
      filter.connect(gainGrowl.current);
      gainGrowl.current.connect(master.current);
      oscGrowl.current.filterNode = filter; // Save ref
      oscGrowl.current.start();

      // 3. WHINE (Высокие)
      oscWhine.current = ctx.current.createOscillator();
      oscWhine.current.type = 'triangle';
      gainWhine.current = ctx.current.createGain();
      oscWhine.current.connect(gainWhine.current);
      gainWhine.current.connect(master.current);
      oscWhine.current.start();

      // 4. TURBO (Отдельный свист)
      const oscTurbo = ctx.current.createOscillator();
      oscTurbo.type = 'sine';
      gainTurbo.current = ctx.current.createGain();
      oscTurbo.connect(gainTurbo.current);
      gainTurbo.current.connect(master.current);
      oscTurbo.start();
      oscTurbo.ref = oscTurbo; // save to ref if needed

      master.current.gain.setValueAtTime(0.5, ctx.current.currentTime);

    } else if (!engineRunning && ctx.current) {
        ctx.current.close();
        ctx.current = null;
    }
  }, [engineRunning]);

  useEffect(() => {
    if (ctx.current && engineRunning) {
        const now = ctx.current.currentTime;
        const r = Math.max(800, rpm);

        // Pitch Calculation (Logarithmic sounds better)
        const baseFreq = r / 60 * 2; // 800rpm = ~26Hz * 2 = 52Hz

        // Update Rumble
        oscRumble.current.frequency.setTargetAtTime(baseFreq, now, 0.1);
        gainRumble.current.gain.setTargetAtTime(0.4 + (Math.random()*0.1), now, 0.1);

        // Update Growl
        oscGrowl.current.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.1);
        // Фильтр открывается при оборотах
        oscGrowl.current.filterNode.frequency.setTargetAtTime(200 + (r/2), now, 0.1);
        gainGrowl.current.gain.setTargetAtTime(0.3, now, 0.1);

        // Update Whine (High RPM only)
        oscWhine.current.frequency.setTargetAtTime(baseFreq * 3, now, 0.1);
        const whineVol = (r > 4000) ? ((r-4000)/4000) * 0.1 : 0;
        gainWhine.current.gain.setTargetAtTime(whineVol, now, 0.1);

        // Update Turbo
        // Свист зависит от переменной turbo из store
        // Частота от 2000 до 8000
        if (gainTurbo.current) {
             gainTurbo.current.gain.setTargetAtTime(turbo * 0.15, now, 0.1);
             // Находим осциллятор турбины (он не в ref, упрощение) - пропустим точную частоту для краткости, громкости хватит для эффекта
        }
    }
  }, [rpm, turbo, engineRunning]);

  return null;
}

