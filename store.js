import { create } from 'zustand';

const lerp = (start, end, t) => start * (1 - t) + end * t;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const useStore = create((set, get) => ({
  // Inputs
  gas: 0,
  brake: 0,
  nitroActive: false,
  
  // System
  ignition: false,
  engineRunning: false,
  lights: false,
  
  // Physics State
  rpm: 0,
  speed: 0,     // km/h
  gear: 1,
  temp: 85,     // Celsius
  turbo: 0,     // 0.0 - 1.0 (Pressure)
  odometer: 1420,
  
  // Visuals
  shake: 0,
  smokeIntensity: 0, // Для перегрева/бернаута
  roadCurve: 0,      // Текущий изгиб дороги

  // Actions
  setGas: (v) => set({ gas: clamp(v, 0, 1) }),
  setBrake: (v) => set({ brake: clamp(v, 0, 1) }),
  setNitro: (v) => set({ nitroActive: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.ignition) {
        set({ ignition: false, engineRunning: false, rpm: 0, turbo: 0 });
    } else {
        set({ ignition: true });
        setTimeout(() => set({ engineRunning: true, rpm: 800 }), 600);
    }
  },

  updatePhysics: (dt) => {
    const s = get();
    if (!s.ignition) return;

    const idleRPM = 800 + Math.random() * 30;
    const maxRPM = 7500;
    const isBurnout = s.brake > 0.1 && s.gas > 0.1;

    // 1. ЦЕЛЕВЫЕ ОБОРОТЫ
    let targetRPM = idleRPM;
    if (s.engineRunning) {
        // Газ поднимает обороты, но под нагрузкой (если едем) это тяжелее
        const load = clamp(s.speed / 200, 0, 1); 
        const power = s.gas * (s.nitroActive ? 1.5 : 1.0);
        
        if (s.gear === 0) { // Нейтраль
             targetRPM += power * 7000;
        } else {
             // На передаче обороты привязаны к скорости, но могут проскальзывать (сцепление)
             // Если скорость 0, а газ в пол -> Stall (глохнет) или Burnout
             if (s.speed < 5 && s.gas > 0.1 && !isBurnout) {
                 // Пытается тронуться - обороты падают (нагрузка)
                 targetRPM = 1200 + power * 1000; 
             } else {
                 targetRPM += power * 7000 * (1 - load * 0.3);
             }
        }
    }
    
    if (isBurnout) targetRPM = 5000 + (Math.random() * 500); // Ограничитель при бернауте

    // Плавность стрелки (Инерция маховика)
    let newRPM = lerp(s.rpm, targetRPM, dt * (s.gas > 0.1 ? 2.0 : 1.0));
    
    // Отсечка
    if (newRPM > 7200) newRPM = 7100 + Math.random() * 200;

    // 2. КОРОБКА ПЕРЕДАЧ (Медленная, старая)
    let nextGear = s.gear;
    if (newRPM > 6800 && s.gear < 5 && !isBurnout) {
        nextGear++;
        newRPM -= 2000; // Падение оборотов
    } else if (newRPM < 1500 && s.gear > 1) {
        nextGear--;
        newRPM += 1000;
    }

    // 3. СКОРОСТЬ (Медленный разгон)
    // Формула: (Мощность - Сопротивление Воздуха - Тормоз)
    const hp = s.gas * 120 * (s.nitroActive ? 2.5 : 1.0); // 120 лошадей (мало, зато реалистично)
    const drag = (s.speed * s.speed) * 0.008; 
    const friction = 10;
    const brakeForce = s.brake * 600;

    let accel = (hp / nextGear) - drag - friction;
    if (!isBurnout) accel -= brakeForce;
    else accel = 0; // На бернауте стоим

    let newSpeed = s.speed + accel * dt * 0.8; // 0.8 замедляет физику времени
    if (newSpeed < 0) newSpeed = 0;

    // 4. ТЕМПЕРАТУРА И ДЫМ
    let targetTemp = 90 + (s.rpm / 7000) * 20;
    if (isBurnout || s.nitroActive) targetTemp += 40;
    let newTemp = lerp(s.temp, targetTemp, dt * 0.2);
    
    // Дым если перегрев или бернаут
    let smoke = 0;
    if (isBurnout) smoke = 1.0;
    if (newTemp > 115) smoke = (newTemp - 115) / 15;

    // 5. ТУРБИНА (Свист)
    let targetTurbo = (s.gas > 0.5 && s.rpm > 2500) ? 1.0 : 0.0;
    let newTurbo = lerp(s.turbo, targetTurbo, dt * 1.5);

    // 6. ДОРОГА (Повороты)
    // Меняем кривизну плавно по синусоиде времени
    const time = Date.now() / 5000;
    const curve = Math.sin(time) * 20;

    set({
      rpm: newRPM,
      speed: newSpeed,
      gear: nextGear,
      temp: newTemp,
      turbo: newTurbo,
      smokeIntensity: smoke,
      roadCurve: curve,
      odometer: s.odometer + (newSpeed * dt * 0.001),
      shake: (newSpeed / 300) + (isBurnout ? 0.05 : 0) + (s.nitroActive ? 0.1 : 0)
    });
  }
}));

