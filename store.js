import { create } from 'zustand';

// Полезная математика для плавности (Linear Interpolation)
const lerp = (start, end, t) => start * (1 - t) + end * t;

export const useStore = create((set, get) => ({
  // --- USER INPUTS (Аналоговые 0.0 - 1.0) ---
  gas: 0,
  brake: 0,
  nitroActive: false,
  
  // --- CAR STATE ---
  ignition: false,     // Включено ли зажигание (электрика)
  engineRunning: false,// Заведен ли мотор
  lights: false,       // Фары
  
  // --- PHYSICS STATE ---
  rpm: 0,              // Обороты (0 - 8000)
  speed: 0,            // Скорость (0 - 300 km/h)
  gear: 1,             // Передача (1 - 6)
  turboPressure: 0,    // Давление турбины (0.0 - 1.0) для звука свиста
  odometer: 1240,      // Пробег
  shake: 0,            // Тряска камеры
  
  // --- ACTIONS ---
  setGas: (val) => set({ gas: Math.max(0, Math.min(1, val)) }),
  setBrake: (val) => set({ brake: Math.max(0, Math.min(1, val)) }),
  setNitro: (active) => set({ nitroActive: active }),
  toggleLights: () => set((state) => ({ lights: !state.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.engineRunning) {
      // Глушим
      set({ engineRunning: false, ignition: false, rpm: 0, turboPressure: 0 });
    } else {
      // Заводим (сначала электрика, через 0.8сек мотор)
      set({ ignition: true });
      setTimeout(() => {
        // Проверка, не выключили ли зажигание в процессе
        if (get().ignition) set({ engineRunning: true, rpm: 900 });
      }, 800);
    }
  },

  // --- PHYSICS ENGINE (60 FPS) ---
  updatePhysics: (dt) => {
    const s = get();
    
    // 1. Если мотор выключен, глушим всё
    if (!s.engineRunning) {
       if (s.rpm > 0) set({ rpm: Math.max(0, s.rpm - 2000 * dt), speed: Math.max(0, s.speed - 10 * dt) });
       return;
    }

    // --- КОНСТАНТЫ АВТОМОБИЛЯ ---
    const maxRPM = 8000;
    const idleRPM = 900;
    const horsePower = 400; // Мощность
    // Передаточные числа (чем выше передача, тем меньше крутящий момент)
    const gearRatios = [0, 3.2, 2.1, 1.6, 1.2, 0.9, 0.7]; 
    
    // --- 2. ЛОГИКА ТУРБИНЫ (TURBO) ---
    // Турбина раскручивается, только если газ > 0.4 и обороты > 3000
    let targetTurbo = 0;
    if (s.gas > 0.4 && s.rpm > 3000) targetTurbo = 1;
    
    // Инерция турбины (раскручивается медленно, сдувается быстро)
    const turboLag = targetTurbo > s.turboPressure ? 0.5 : 2.0;
    let newTurbo = lerp(s.turboPressure, targetTurbo, turboLag * dt);

    // --- 3. РАСЧЕТ ОБОРОТОВ (RPM) ---
    // Целевые обороты зависят от нажатия газа
    // Если Нитро включено - обороты летят в отсечку
    let targetRPM = idleRPM + (s.gas * (maxRPM - idleRPM));
    if (s.nitroActive) targetRPM = maxRPM;

    // Инерция двигателя (маховик): обороты не скачут мгновенно
    let rpmSmoothness = s.gas > 0.1 ? 3 : 1; // Вверх быстро, вниз медленно
    let newRPM = lerp(s.rpm, targetRPM, rpmSmoothness * dt);

    // --- 4. КОРОБКА ПЕРЕДАЧ (AUTOMATIC) ---
    let nextGear = s.gear;
    
    // Переключение ВВЕРХ (Redline)
    if (newRPM > 7200 && s.gear < 6) {
        nextGear++;
        newRPM -= 2500; // Обороты падают при повышении передачи
        newTurbo *= 0.5; // Турбина чуть сдувается (пшик)
    } 
    // Переключение ВНИЗ (Low RPM) - только если машина едет
    else if (newRPM < 2200 && s.gear > 1 && s.speed > 15) {
        nextGear--;
        newRPM += 1500; // Подскок оборотов (Rev match)
    }

    // Лимитер (отсечка)
    newRPM = Math.min(newRPM, maxRPM + (Math.random() * 100));

    // --- 5. СКОРОСТЬ И УСКОРЕНИЕ ---
    // Сила ускорения = (Газ * Мощность * Турбо * Передача)
    const gearMult = 1 / gearRatios[nextGear]; 
    const nitroBoost = s.nitroActive ? 2.5 : 1.0;
    const turboBoost = 1 + (newTurbo * 0.5); // +50% мощности от турбины
    
    // Главная формула разгона
    const accelerationForce = (s.gas * horsePower * gearMult * turboBoost * nitroBoost);
    
    // Сопротивление (Тормоз + Воздух + Трение)
    // Воздух (drag) растет квадратично от скорости
    const airResistance = (s.speed * s.speed) * 0.006; 
    const brakeForce = (s.brake * 1200);
    const friction = 10;

    let totalForce = accelerationForce - brakeForce - airResistance - friction;
    
    // Переводим силу в изменение скорости (F=ma)
    let newSpeed = s.speed + (totalForce * 0.02 * dt);
    
    // Не даем ехать назад (для упрощения)
    if (newSpeed < 0) newSpeed = 0;

    // --- 6. ЭФФЕКТЫ (ТРЯСКА) ---
    // Трясет от скорости + очень сильно от нитро + чуть-чуть от высоких оборотов
    let shakeFactor = (newSpeed / 400) + (s.nitroActive ? 0.15 : 0) + (newRPM > 6000 ? 0.01 : 0);

    set({
      rpm: newRPM,
      speed: newSpeed,
      gear: nextGear,
      turboPressure: newTurbo, // Это нужно для звука в AudioEngine!
      odometer: s.odometer + (newSpeed * dt * 0.001),
      shake: shakeFactor
    });
  }
}));
