import { create } from 'zustand';

const lerp = (start, end, t) => start * (1 - t) + end * t;

export const useStore = create((set, get) => ({
  // Inputs
  gas: 0,
  brake: 0,
  nitroActive: false,
  
  // States
  ignition: false,
  engineRunning: false,
  lights: false,
  isStalling: false, // Троит/Задыхается
  
  // Physics
  rpm: 0,
  speed: 0,
  gear: 1,
  temp: 90, // Температура (90 - норма, 130 - смерть)
  turboPressure: 0,
  odometer: 1240,
  shake: 0,
  
  // Actions
  setGas: (v) => set({ gas: Math.max(0, Math.min(1, v)) }),
  setBrake: (v) => set({ brake: Math.max(0, Math.min(1, v)) }),
  setNitro: (v) => set({ nitroActive: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.engineRunning) {
      set({ engineRunning: false, ignition: false, rpm: 0, turboPressure: 0 });
    } else {
      set({ ignition: true });
      setTimeout(() => {
         if(get().ignition) set({ engineRunning: true, rpm: 900, temp: 90 });
      }, 600);
    }
  },

  updatePhysics: (dt) => {
    const s = get();
    if (!s.ignition) return;

    // --- 1. ЛОГИКА КОНФЛИКТА ПЕДАЛЕЙ (BRAKE + GAS) ---
    const isBurnout = s.brake > 0.1 && s.gas > 0.1;
    
    // Если нажат тормоз:
    // 1. Если газ слабый -> Обороты давятся (машина глохнет)
    // 2. Если газ сильный -> Обороты растут (бернаут), но скорость 0
    let rpmResistance = 0;
    
    if (isBurnout) {
        // Борьба тормоза и двигателя
        if (s.brake > s.gas) rpmResistance = 3000; // Тормоз побеждает -> глохнем
        else rpmResistance = 0; // Газ побеждает -> ревем на месте
    }

    // --- 2. РАСЧЕТ ТЕМПЕРАТУРЫ ---
    // Температура растет от оборотов и ЭКСТРЕМАЛЬНО растет от бернаута
    let targetTemp = 90 + (s.rpm / 8000) * 20;
    if (isBurnout) targetTemp += 50; // Перегрев
    
    let newTemp = lerp(s.temp, targetTemp, 0.5 * dt);
    
    // Смерть от перегрева
    if (newTemp > 130 && s.engineRunning) {
        set({ engineRunning: false, rpm: 0 }); // ГЛОХНЕТ
        // Можно добавить звук "Пшшш" в AudioEngine
    }

    // --- 3. РАСЧЕТ ОБОРОТОВ (RPM) ---
    if (!s.engineRunning) {
         set({ rpm: Math.max(0, s.rpm - 1000 * dt), temp: Math.max(20, s.temp - 5 * dt) });
         return;
    }

    const maxRPM = 8000;
    const idleRPM = 900 + (Math.random() * 50); // Неровный холостой
    
    // Целевые обороты
    let targetRPM = idleRPM + (s.gas * 7500);
    if (s.nitroActive) targetRPM = 9000;
    
    // Применяем сопротивление от тормоза
    targetRPM -= rpmResistance; 

    // Физика маховика
    let newRPM = lerp(s.rpm, targetRPM, (s.gas > 0.1 ? 3 : 1) * dt);
    
    // Эффект "Троения" (Stalling) перед тем как заглохнуть
    let isStalling = false;
    if (newRPM < 600) {
        isStalling = true;
        newRPM += (Math.random() - 0.5) * 300; // Дергается
    }
    
    // Если упали совсем низко - глохнем
    if (newRPM < 300) {
        set({ engineRunning: false });
    }

    // --- 4. ТУРБИНА И СКОРОСТЬ ---
    let targetTurbo = (s.gas > 0.3 && s.rpm > 2500) ? 1 : 0;
    let newTurbo = lerp(s.turboPressure, targetTurbo, 2 * dt);

    // Автомат (переключение)
    let nextGear = s.gear;
    if (newRPM > 7000 && s.gear < 6 && !isBurnout) { // Не переключаем если стоим
        nextGear++;
        newRPM -= 2500;
        newTurbo = 0; // Пшик турбины
    } else if (newRPM < 2000 && s.gear > 1) {
        nextGear--;
        newRPM += 1000;
    }

    // Расчет скорости
    const power = s.gas * 300 * (1/nextGear);
    const brakeForce = s.brake * 1000;
    const friction = s.speed * 0.5;
    
    let accel = power - friction;
    if (!isBurnout) accel -= brakeForce; // Если бернаут - тормоз не тормозит колеса, а держит машину
    else if (isBurnout) accel = 0; // Скорость не растет

    let newSpeed = s.speed + accel * dt * 0.5;
    if (newSpeed < 0) newSpeed = 0;

    set({
      rpm: newRPM,
      speed: newSpeed,
      temp: newTemp,
      turboPressure: newTurbo,
      isStalling: isStalling,
      gear: nextGear,
      odometer: s.odometer + newSpeed * dt * 0.001,
      shake: (newSpeed/400) + (isStalling ? 0.05 : 0) + (s.nitroActive ? 0.1 : 0)
    });
  }
}));

