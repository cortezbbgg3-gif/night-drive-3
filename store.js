import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Controls (0.0 - 1.0)
  gasPressure: 0,  // Сила нажатия газа
  brakePressure: 0,
  nitroActive: false,
  
  // Car State
  ignition: false,
  engineRunning: false,
  lights: false,
  
  // Physics
  rpm: 0,       // 0 - 8000
  speed: 0,     // 0 - 260 km/h
  gear: 1,      // 1 - 6
  odometer: 1240, // Пробег
  
  // Visual Shake Factor (для эффектов)
  shake: 0,

  // Actions
  setGas: (val) => set({ gasPressure: val }),
  setBrake: (val) => set({ brakePressure: val }),
  setNitro: (val) => set({ nitroActive: val }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  toggleIgnition: () => {
    const s = get();
    if(s.engineRunning) {
        set({ engineRunning: false, ignition: false, rpm: 0, speed: 0 });
    } else {
        set({ ignition: true });
        // Заводим через 800мс
        setTimeout(() => set({ engineRunning: true, rpm: 900 }), 800);
    }
  },

  // === ФИЗИЧЕСКОЕ ЯДРО (ВЫЗЫВАЕТСЯ КАЖДЫЙ КАДР) ===
  updatePhysics: (dt) => {
    const s = get();
    if (!s.engineRunning) return;

    // 1. КОНФИГУРАЦИЯ АВТО
    const gearRatios = [0, 3.8, 2.4, 1.8, 1.4, 1.1, 0.9]; // Передаточные числа
    const finalDrive = 3.5;
    const maxRPM = 7500;
    const idleRPM = 900;
    
    // 2. РАСЧЕТ ОБОРОТОВ (RPM)
    let targetRPM = s.rpm;
    let torque = s.gasPressure * (s.nitroActive ? 2.5 : 1.0); // Нитро удваивает силу
    
    // Если газ нажат, обороты растут быстро, если нет - падают медленно
    if (s.gasPressure > 0.1) {
        targetRPM += torque * 4000 * dt; 
    } else {
        targetRPM -= (2000 + s.brakePressure * 5000) * dt;
    }
    
    // Сцепление с дорогой (RPM зависит от скорости и передачи)
    // Это эмуляция жесткой сцепки (Lock-up)
    const wheelRPM = (s.speed / 200) * 8000; // Грубая конвертация
    // Смешиваем "свободные" обороты и обороты от колес
    // На нейтрали (или выжатом сцеплении при переключении) обороты свободны
    
    // ЛОГИКА ПЕРЕКЛЮЧЕНИЯ (АВТОМАТ)
    let nextGear = s.gear;
    if (s.rpm > 7000 && s.gear < 6) {
        // SHIFT UP
        nextGear++;
        targetRPM -= 2500; // Обороты падают при повышении
    } else if (s.rpm < 2000 && s.gear > 1 && s.speed > 10) {
        // SHIFT DOWN
        nextGear--;
        targetRPM += 1500; // Подгазовка
    }

    // Ограничители
    targetRPM = Math.max(idleRPM, Math.min(maxRPM + (Math.random()*100), targetRPM));

    // 3. РАСЧЕТ СКОРОСТИ
    // Ускорение зависит от передачи (на 1-й мощно, на 6-й слабо)
    const gearFactor = 1 / nextGear; 
    const accel = (torque * 30 * gearFactor) - (s.brakePressure * 80) - (s.speed * 0.05); // 0.05 трение воздуха
    
    let nextSpeed = s.speed + accel * dt;
    if (nextSpeed < 0) nextSpeed = 0;

    // 4. ТРЯСКА (SHAKE)
    // Трясет от скорости + очень сильно от НИТРО
    let shakeVal = (nextSpeed / 300);
    if (s.nitroActive) shakeVal += 0.1; // Рывок камеры
    
    set({
        rpm: targetRPM,
        speed: nextSpeed,
        gear: nextGear,
        odometer: s.odometer + (nextSpeed * dt * 0.0002), // Наматываем пробег
        shake: shakeVal
    });
  }
}));
