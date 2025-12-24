import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm } = useStore();
  const audioCtx = useRef(null);
  const osc = useRef(null);
  const gain = useRef(null);

  useEffect(() => {
    if (engineRunning && !audioCtx.current) {
      // Init Sound
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx.current = new AudioContext();
      
      osc.current = audioCtx.current.createOscillator();
      gain.current = audioCtx.current.createGain();
      
      // Более сложная волна для реализма (вместо sawtooth)
      // Комбинируем низкие и высокие гармоники
      const real = new Float32Array([0, 0.4, 0.4, 1, 1, 1, 0.3, 0.7, 0.6, 0.5, 0.9, 0.8]);
      const imag = new Float32Array(real.length).fill(0);
      const wave = audioCtx.current.createPeriodicWave(real, imag);
      osc.current.setPeriodicWave(wave);

      // Lowpass filter (звук из салона)
      const filter = audioCtx.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;
      
      osc.current.connect(filter);
      filter.connect(gain.current);
      gain.current.connect(audioCtx.current.destination);
      
      gain.current.gain.value = 0; // Начинаем с тишины
      osc.current.start();
      // Плавный старт громкости
      gain.current.gain.setTargetAtTime(0.3, audioCtx.current.currentTime, 0.5);
      
    } else if (!engineRunning && audioCtx.current) {
      // Плавное выключение (Fade out) за 0.5 сек
      if (gain.current) {
          gain.current.gain.setTargetAtTime(0, audioCtx.current.currentTime, 0.2);
      }
      // Полная остановка через секунду
      setTimeout(() => {
          if (audioCtx.current && audioCtx.current.state !== 'closed') {
            osc.current.stop();
            audioCtx.current.close();
            audioCtx.current = null;
          }
      }, 500);
    }
  }, [engineRunning]);

  // Модуляция звука от оборотов
  useEffect(() => {
    if (audioCtx.current && engineRunning && osc.current) {
        // Pitch: Басовитее на низах (40Hz), выше на верхах (350Hz)
        const pitch = 40 + (rpm / 7500) * 310;
        osc.current.frequency.setTargetAtTime(pitch, audioCtx.current.currentTime, 0.05);
        
        // Rumble: Громкость чуть дрожит и растет с оборотами
        const baseVol = 0.2 + (rpm / 8000) * 0.2;
        const rumble = baseVol + (Math.random() * 0.05);
        gain.current.gain.setTargetAtTime(rumble, audioCtx.current.currentTime, 0.05);
    }
  }, [rpm, engineRunning]);

  return null;
}
