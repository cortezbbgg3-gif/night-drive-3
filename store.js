import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Controls
  gas: 0,
  brake: 0,
  nitro: false,
  lightsOn: false,
  
  // Vehicle State
  rpm: 800,
  speed: 0,
  gear: 1,
  engineTemp: 50, // Градусы Цельсия
  distance: 0,
  isEngineOn: false,
  
  // Actions
  setGas: (val) => set({ gas: Math.max(0, Math.min(1, val)) }),
  setBrake: (val) => set({ brake: Math.max(0, Math.min(1, val)) }),
  setNitro: (val) => set({ nitro: val }),
  toggleLights: () => set((state) => ({ lightsOn: !state.lightsOn })),
  toggleEngine: () => set((state) => ({ isEngineOn: !state.isEngineOn })),
  
  // Physics Update Loop
  updatePhysics: (delta) => {
    const s = get();
    if (!s.isEngineOn) {
        // Если двигатель выключен, обороты падают до 0
        if (s.rpm > 0) set({ rpm: Math.max(0, s.rpm - 1000 * delta) });
        return;
    }

    // Параметры авто
    const maxRPM = 8000;
    const idleRPM = 900;
    const powerFactor = s.nitro ? 3.0 : 1.0; // Нитро дает рывок
    
    // 1. Расчет оборотов (RPM)
    // Газ поднимает обороты, но с инерцией (lerp)
    let targetRPM = idleRPM + (s.gas * (maxRPM - idleRPM));
    if (s.nitro) targetRPM = maxRPM; // Нитро кладет стрелку
    
    // Эмуляция нагрузки: если скорость растет, обороты растут медленнее
    const load = s.speed / 200; 
    const revSpeed = (s.gas * 5000 * powerFactor * (1 - load * 0.5)) * delta;
    const revDrop = (2000 + s.brake * 3000) * delta;
    
    let newRPM = s.rpm;
    if (s.gas > 0.05) {
        newRPM += revSpeed;
    } else {
        newRPM -= revDrop;
    }
    
    // Лимиты и дрожание стрелки (Noise)
    newRPM = Math.max(idleRPM, Math.min(maxRPM, newRPM));
    const jitter = (Math.random() - 0.5) * (s.rpm / 200); // Чем выше обороты, тем сильнее вибрация
    
    // 2. Расчет Скорости
    // Скорость зависит от RPM и передачи (упрощенно)
    const acceleration = (s.gas * 20 * powerFactor) - (s.brake * 60) - (s.speed * 0.1); // 0.1 - сопротивление воздуха
    let newSpeed = s.speed + acceleration * delta;
    newSpeed = Math.max(0, newSpeed);

    // 3. Температура
    // Растет от высоких оборотов
    let targetTemp = 90 + (s.rpm / maxRPM) * 30; // Рабочая ~90-120
    let newTemp = s.engineTemp + (targetTemp - s.engineTemp) * delta * 0.05;

    set({ 
      rpm: newRPM + jitter, 
      speed: newSpeed, 
      engineTemp: newTemp,
      distance: s.distance + (newSpeed * delta)
    });
  }
}));
