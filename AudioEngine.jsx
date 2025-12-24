import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { isEngineOn, rpm, speed } = useStore();
  const audioCtx = useRef(null);
  const oscillator = useRef(null);
  const gainNode = useRef(null);
  const noiseNode = useRef(null);

  // Инициализация звука
  useEffect(() => {
    if (isEngineOn && !audioCtx.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx.current = new Ctx();

        // 1. Основной гул (Low Rumble)
        oscillator.current = audioCtx.current.createOscillator();
        gainNode.current = audioCtx.current.createGain();
        
        oscillator.current.type = 'sawtooth'; // Грубый звук мотора
        oscillator.current.frequency.value = 50;
        
        // Фильтр для мягкости (Muffle)
        const filter = audioCtx.current.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        oscillator.current.connect(filter);
        filter.connect(gainNode.current);
        gainNode.current.connect(audioCtx.current.destination);
        
        oscillator.current.start();
        gainNode.current.gain.value = 0.1;
    } else if (!isEngineOn && audioCtx.current) {
        audioCtx.current.close();
        audioCtx.current = null;
    }
  }, [isEngineOn]);

  // Обновление звука каждый кадр данных
  useEffect(() => {
    if (audioCtx.current && isEngineOn) {
        // Pitch (высота тона) зависит от RPM
        // 800 rpm -> 60 Hz, 8000 rpm -> 400 Hz
        const pitch = 60 + (rpm / 8000) * 300;
        oscillator.current.frequency.setTargetAtTime(pitch, audioCtx.current.currentTime, 0.1);
        
        // Volume (Громкость) чуть растет с нагрузкой
        const vol = 0.1 + (rpm / 8000) * 0.1;
        gainNode.current.gain.setTargetAtTime(vol, audioCtx.current.currentTime, 0.1);
    }
  }, [rpm, isEngineOn]);

  return null; // Это невидимый компонент
}
