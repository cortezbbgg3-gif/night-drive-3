import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { engineRunning, rpm, nitroActive } = useStore();
  
  // Refs для аудио-нод
  const ctxRef = useRef(null);
  const masterGain = useRef(null);
  
  // Слой 1: Основной рык (Oscillator)
  const oscRef = useRef(null);
  
  // Слой 2: Модулятор (Делает звук "неровным", как ДВС)
  const modRef = useRef(null);
  const modGainRef = useRef(null); // Сила модуляции
  
  // Слой 3: Шум (Intake / Air)
  const noiseNodeRef = useRef(null);
  const noiseGainRef = useRef(null);

  // Фильтр (глушит звук на низких оборотах)
  const filterRef = useRef(null);

  // Инициализация звукового движка
  useEffect(() => {
    if (engineRunning && !ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();

      // Мастер громкость
      masterGain.current = ctxRef.current.createGain();
      masterGain.current.connect(ctxRef.current.destination);

      // --- 1. SETUP NOISE (ШУМ ВПУСКА) ---
      const bufferSize = ctxRef.current.sampleRate * 2; // 2 секунды шума
      const buffer = ctxRef.current.createBuffer(1, bufferSize, ctxRef.current.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Pink Noise (мягче белого шума)
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain correction
      }
      let lastOut = 0;

      noiseNodeRef.current = ctxRef.current.createBufferSource();
      noiseNodeRef.current.buffer = buffer;
      noiseNodeRef.current.loop = true;
      
      noiseGainRef.current = ctxRef.current.createGain();
      noiseGainRef.current.gain.value = 0;
      
      noiseNodeRef.current.connect(noiseGainRef.current);
      noiseGainRef.current.connect(masterGain.current);
      noiseNodeRef.current.start();


      // --- 2. SETUP ENGINE TONE (FM SYNTHESIS) ---
      
      // Carrier (Несущая волна - сам звук мотора)
      oscRef.current = ctxRef.current.createOscillator();
      oscRef.current.type = 'sawtooth'; // Пила - основа для агрессивного звука

      // Modulator (Вибрация - эмуляция тактов двигателя)
      modRef.current = ctxRef.current.createOscillator();
      modRef.current.type = 'square'; // Квадрат дает резкость
      
      modGainRef.current = ctxRef.current.createGain();
      
      // Filter (Lowpass) - чтобы убрать "цифровой песок"
      filterRef.current = ctxRef.current.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.Q.value = 5; // Резонанс для "рыка"

      // Distortion Curve (Самое важное для реализма)
      const shaper = ctxRef.current.createWaveShaper();
      shaper.curve = makeDistortionCurve(400); // Функция ниже
      shaper.oversample = '4x';

      // ЦЕПОЧКА ПОДКЛЮЧЕНИЯ:
      // Modulator -> ModGain -> Carrier.frequency (FM Синтез!)
      modRef.current.connect(modGainRef.current);
      modGainRef.current.connect(oscRef.current.frequency);
      
      // Carrier -> Filter -> Distortion -> Master
      oscRef.current.connect(filterRef.current);
      filterRef.current.connect(shaper);
      shaper.connect(masterGain.current);

      oscRef.current.start();
      modRef.current.start();

      // Fade In
      masterGain.current.gain.setValueAtTime(0, ctxRef.current.currentTime);
      masterGain.current.gain.linearRampToValueAtTime(0.5, ctxRef.current.currentTime + 0.5);

    } else if (!engineRunning && ctxRef.current) {
      // Fade Out и выключение
      masterGain.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.1);
      setTimeout(() => {
        if (ctxRef.current) {
            ctxRef.current.close();
            ctxRef.current = null;
        }
      }, 200);
    }
  }, [engineRunning]);

  // ОБНОВЛЕНИЕ ЗВУКА КАЖДЫЙ КАДР (РЕАКЦИЯ НА RPM)
  useEffect(() => {
    if (ctxRef.current && engineRunning) {
        const time = ctxRef.current.currentTime;
        const r = Math.max(800, rpm); // Min 800

        // 1. PITCH (Высота тона)
        // Базовая частота: 800rpm -> ~40Hz, 8000rpm -> ~300Hz
        const baseFreq = 30 + (r / 8000) * 300;
        oscRef.current.frequency.setTargetAtTime(baseFreq, time, 0.05);

        // 2. MODULATION (Рычание)
        // На низких оборотах модуляция сильная (Тррр-тррр)
        // На высоких она сливается в ровный гул
        const modFreq = baseFreq * 0.5; // Суб-гармоника
        modRef.current.frequency.setTargetAtTime(modFreq, time, 0.05);
        
        // Чем выше обороты, тем меньше "трясет" звук (FM depth)
        const modDepth = (8000 - r) * 0.05; 
        modGainRef.current.gain.setTargetAtTime(Math.max(0, modDepth), time, 0.05);

        // 3. FILTER (Открытие дросселя)
        // Чем больше обороты, тем больше высоких частот проходит
        const filterFreq = 200 + (r / 8000) * 3000;
        filterRef.current.frequency.setTargetAtTime(filterFreq, time, 0.1);

        // 4. NOISE (Шум ветра/впуска)
        // Появляется только на высоких оборотах
        const noiseVol = (r / 8000) * 0.3;
        noiseGainRef.current.gain.setTargetAtTime(noiseVol, time, 0.1);

        // 5. NITRO EFFECT
        if (nitroActive) {
            // Резко повышаем питч и громкость
             oscRef.current.frequency.setTargetAtTime(baseFreq * 1.5, time, 0.2);
             masterGain.current.gain.setTargetAtTime(0.8, time, 0.1);
        } else {
             masterGain.current.gain.setTargetAtTime(0.5, time, 0.1);
        }
    }
  }, [rpm, nitroActive, engineRunning]);

  return null;
}

// Функция для создания искажения (Distortion)
// Делает звук "квадратным" и агрессивным
function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

