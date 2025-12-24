import { create } from 'zustand';

const lerp = (start, end, t) => start * (1 - t) + end * t;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const useStore = create((set, get) => ({
  // Inputs
  gas: 0,
  brake: 0,
  nitroActive: false,
  
  // System States
  ignition: false,      // Электрика включена
  isCranking: false,    // Работает стартер
  engineRunning: false, // Двигатель работает
  isBroken: false,      // Двигатель сломан (перегрев)
  lights: false,
  
  // Physics
  rpm: 0,
  speed: 0,
  gear: 1,
  temp: 70,             // Рабочая температура
  turbo: 0,
  odometer: 1450,
  
  // Visual FX
  shake: 0,             // Тряска камеры
  smoke: 0,             // Интенсивность дыма (0.0 - 1.0)
  msg: "",              // Сообщения (Stall, Broken)

  // Actions
  setGas: (v) => set({ gas: clamp(v, 0, 1) }),
  setBrake: (v) => set({ brake: clamp(v, 0, 1) }),
  setNitro: (v) => set({ nitroActive: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    // Если двигатель сломан - ничего не делаем
    if (s.isBroken) {
        set({ msg: "ENGINE DAMAGED" });
        return;
    }

    if (s.engineRunning || s.isCranking) {
        // Глушим
        set({ engineRunning: false, isCranking: false, ignition: false, rpm: 0, turbo: 0, msg: "" });
    } else {
        // Процесс запуска
        set({ ignition: true, isCranking: true, msg: "STARTING..." });
        
        // Стартер крутит 1.5 секунды
        setTimeout(() => {
            const current = get();
            if (current.ignition && !current.isBroken) {
                set({ isCranking: false, engineRunning: true, rpm: 900, msg: "" });
            }
        }, 1500);
    }
  },

  updatePhysics: (dt) => {
    const s = get();
    
    // --- 0. ЕСЛИ СЛОМАН ИЛИ ВЫКЛЮЧЕН ---
    if (s.isBroken || (!s.engineRunning && !s.isCranking)) {
       // Остываем и замедляемся
       set({ 
           rpm: Math.max(0, s.rpm - 2000 * dt), 
           speed: Math.max(0, s.speed - 10 * dt),
           smoke: Math.max(0, s.smoke - 0.1 * dt),
           temp: Math.max(20, s.temp - 1 * dt)
       });
       return;
    }

    // --- 1. СТАРТЕР (CRANKING) ---
    if (s.isCranking) {
        // Стрелка дергается при запуске (200-400 об/мин)
        set({ rpm: 300 + Math.random() * 100, shake: 0.02 });
        return;
    }

    // --- 2. РАБОТА ДВИГАТЕЛЯ ---
    const isBurnout = s.brake > 0.1 && s.gas > 0.1;
    const idleRPM = 800 + (Math.random() * 50); // Неровный холостой
    
    // Целевые обороты
    let targetRPM = idleRPM;
    const load = clamp(s.speed / 250, 0, 1);
    const power = s.gas * (s.nitroActive ? 1.6 : 1.0);

    // Логика Глохнет (STALLING)
    // Если мы на 1 передаче, скорость 0, тормоз нажат, а газа нет -> глохнем
    if (s.gear === 1 && s.speed < 2 && s.brake > 0.5 && s.gas < 0.1) {
        targetRPM = 0;
        set({ msg: "STALLING" });
        if (s.rpm < 300) {
            set({ engineRunning: false, ignition: false, msg: "ENGINE STALLED" });
        }
    } else {
        // Обычная работа
        if (s.gear === 0) targetRPM += power * 7200; // Нейтраль
        else {
             // Бернаут позволяет раскрутить мотор стоя
             if (isBurnout) targetRPM = 5000 + (s.gas * 2000); 
             else targetRPM += power * 7200 * (1 - load * 0.4);
        }
    }

    // Интерполяция RPM (инерция)
    let newRPM = lerp(s.rpm, targetRPM, dt * 2);
    // Отсечка (Rev Limiter)
    if (newRPM > 7200) newRPM = 7100 + (Math.random() * 200);

    // --- 3. ТЕМПЕРАТУРА И ПОЛОМКА ---
    let heatGen = (s.rpm / 7000) * 5; // Нагрев от оборотов
    if (isBurnout) heatGen += 20;     // Экстремальный нагрев
    if (s.nitroActive) heatGen += 10;
    
    // Охлаждение от скорости (обдув)
    let cooling = (s.speed / 100) * 8; 
    let targetTemp = 90 + heatGen - cooling;
    
    // Инерция температуры
    let newTemp = lerp(s.temp, targetTemp, dt * 0.1);
    
    // Дым (идет если температура > 115)
    let newSmoke = 0;
    if (newTemp > 115) newSmoke = (newTemp - 115) / 15; // 0..1
    
    // ВЗРЫВ / ПОЛОМКА
    if (newTemp > 135) {
        set({ isBroken: true, engineRunning: false, smoke: 1.0, msg: "ENGINE BLOWN!" });
        return;
    }

    // --- 4. КОРОБКА ПЕРЕДАЧ ---
    let nextGear = s.gear;
    if (newRPM > 6900 && s.gear < 6 && !isBurnout) {
        nextGear++;
        newRPM -= 2000;
    } else if (newRPM < 1800 && s.gear > 1) {
        nextGear--;
        newRPM += 1000;
    }

    // --- 5. СКОРОСТЬ ---
    const hp = 300; // Лошадиные силы
    const drag = (s.speed * s.speed) * 0.006;
    const brakeForce = s.brake * 800;
    
    let accel = (s.gas * hp / nextGear) - drag - 5;
    if (!isBurnout) accel -= brakeForce;
    else accel = 0; // На месте

    let newSpeed = s.speed + accel * dt * 0.6;
    if (newSpeed < 0) newSpeed = 0;

    // --- 6. ТРЯСКА И ТУРБИНА ---
    let targetTurbo = (s.gas > 0.4 && s.rpm > 3000) ? 1 : 0;
    let shakeFactor = (newSpeed / 300) + (isBurnout ? 0.05 : 0) + (s.nitroActive ? 0.15 : 0);
    if (s.isCranking) shakeFactor = 0.02;

    set({
        rpm: newRPM,
        speed: newSpeed,
        temp: newTemp,
        gear: nextGear,
        turbo: lerp(s.turbo, targetTurbo, dt),
        smoke: newSmoke,
        shake: shakeFactor,
        odometer: s.odometer + (newSpeed * dt * 0.001)
    });
  }
}));

