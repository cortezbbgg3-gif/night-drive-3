import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm } = useStore();
  const audioCtx = useRef(null);
  const osc = useRef(null);
  const gain = useRef(null);

  // Init Audio Context (нужен жест пользователя, поэтому он стартует внутри эффекта при engineRunning)
  useEffect(() => {
    if (engineRunning && !audioCtx.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx.current = new AudioContext();
      
      // Создаем осциллятор (Генератор звука)
      osc.current = audioCtx.current.createOscillator();
      gain.current = audioCtx.current.createGain();
      
      // Настройка звука двигателя (Sawtooth + Lowpass filter)
      osc.current.type = 'sawtooth';
      osc.current.frequency.value = 50; // Базовая частота
      
      // Фильтр, чтобы звук был глухим (как из салона)
      const filter = audioCtx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      osc.current.connect(filter);
      filter.connect(gain.current);
      gain.current.connect(audioCtx.current.destination);
      
      osc.current.start();
      gain.current.gain.value = 0.2; // Громкость
      
    } else if (!engineRunning && audioCtx.current) {
      // Глушим мотор
      gain.current.gain.setTargetAtTime(0, audioCtx.current.currentTime, 0.5);
      setTimeout(() => {
          if (audioCtx.current) {
            audioCtx.current.close();
            audioCtx.current = null;
          }
      }, 500);
    }
  }, [engineRunning]);

  // Modulate Sound based on RPM
  useEffect(() => {
    if (audioCtx.current && engineRunning) {
        // Чем выше обороты -> тем выше тон (Pitch)
        // 800 RPM = 60Hz, 7000 RPM = 300Hz
        const pitch = 60 + (rpm / 7000) * 250;
        osc.current.frequency.setTargetAtTime(pitch, audioCtx.current.currentTime, 0.1);
        
        // Вибрация (LFO эффект на громкость)
        // Чем выше обороты, тем ровнее звук
        const rumble = 0.2 + (Math.random() * 0.05);
        gain.current.gain.setTargetAtTime(rumble, audioCtx.current.currentTime, 0.1);
    }
  }, [rpm, engineRunning]);

  return null;
}
