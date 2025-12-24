import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, isCranking, isBroken, rpm, turbo } = useStore();
  const ctx = useRef(null);
  const master = useRef(null);
  
  // Звуковые узлы
  const oscRumble = useRef(null);
  const oscCrank = useRef(null); // Стартер
  const noiseNode = useRef(null);
  const gainCrank = useRef(null);
  const gainEngine = useRef(null);
  const gainTurbo = useRef(null);

  useEffect(() => {
    // ИНИЦИАЛИЗАЦИЯ (Запускается при ignition)
    if ((engineRunning || isCranking) && !ctx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx.current = new Ctx();
      master.current = ctx.current.createGain();
      master.current.connect(ctx.current.destination);

      // 1. ENGINE SOUND (Rumble)
      oscRumble.current = ctx.current.createOscillator();
      oscRumble.current.type = 'sawtooth';
      gainEngine.current = ctx.current.createGain();
      
      // Фильтр для глухого звука
      const filter = ctx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      oscRumble.current.connect(filter);
      filter.connect(gainEngine.current);
      gainEngine.current.connect(master.current);
      oscRumble.current.start();
      gainEngine.current.gain.value = 0; // Сначала тишина

      // 2. STARTER SOUND (Pulse)
      oscCrank.current = ctx.current.createOscillator();
      oscCrank.current.type = 'square';
      oscCrank.current.frequency.value = 15; // 15Hz вибрация
      gainCrank.current = ctx.current.createGain();
      gainCrank.current.gain.value = 0;
      
      oscCrank.current.connect(gainCrank.current);
      gainCrank.current.connect(master.current);
      oscCrank.current.start();

      // 3. TURBO WHINE
      const oscTurbo = ctx.current.createOscillator();
      oscTurbo.type = 'sine';
      gainTurbo.current = ctx.current.createGain();
      gainTurbo.current.gain.value = 0;
      oscTurbo.connect(gainTurbo.current);
      gainTurbo.current.connect(master.current);
      oscTurbo.start();
      oscTurbo.ref = oscTurbo;

    } else if (!engineRunning && !isCranking && ctx.current) {
        // Выключение
        ctx.current.close();
        ctx.current = null;
    }
  }, [engineRunning, isCranking]);

  useEffect(() => {
    if (ctx.current) {
        const now = ctx.current.currentTime;

        // --- ЛОГИКА СТАРТЕРА ---
        if (isCranking) {
            // Звук "Чи-чи-чи": Квадратная волна прерывается
            oscCrank.current.frequency.setValueAtTime(10, now);
            // LFO эффект громкости
            gainCrank.current.gain.setTargetAtTime(0.5, now, 0.05);
            gainEngine.current.gain.setTargetAtTime(0, now, 0.1);
        } else {
            gainCrank.current.gain.setTargetAtTime(0, now, 0.1);
        }

        // --- ЛОГИКА ДВИГАТЕЛЯ ---
        if (engineRunning) {
            const r = Math.max(100, rpm);
            // Питч растет с оборотами
            const pitch = r / 60 * 1.5; 
            oscRumble.current.frequency.setTargetAtTime(pitch, now, 0.1);
            
            // Громкость
            gainEngine.current.gain.setTargetAtTime(0.4, now, 0.1);
            
            // Турбина
            if(oscTurbo.ref) oscTurbo.ref.frequency.setTargetAtTime(2000 + turbo*5000, now, 0.1);
            gainTurbo.current.gain.setTargetAtTime(turbo * 0.2, now, 0.1);
        }

        // --- ЛОГИКА ПОЛОМКИ (ВЗРЫВ) ---
        if (isBroken) {
            // Резко глушим всё
            gainEngine.current.gain.setTargetAtTime(0, now, 0.05);
            gainTurbo.current.gain.setTargetAtTime(0, now, 0.05);
            // Здесь можно добавить "Bang" шум, если усложнить код
        }
    }
  }, [rpm, turbo, isCranking, engineRunning, isBroken]);

  return null;
}
