import { create } from 'zustand';

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const lerp = (start, end, t) => start * (1 - t) + end * t;

export const useStore = create((set, get) => ({
  // Inputs
  gas: 0,
  brake: 0,
  nitro: false,

  // System
  ignition: false,
  engineRunning: false,
  lights: false,
  
  // Physics
  rpm: 0,
  speed: 0,
  gear: 1,
  temp: 85,
  turbo: 0,
  dist: 0,
  
  // FX
  shake: 0,
  msg: null,

  // Actions
  setGas: (v) => set({ gas: clamp(v, 0, 1) }),
  setBrake: (v) => set({ brake: clamp(v, 0, 1) }),
  setNitro: (v) => set({ nitro: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.engineRunning) {
        set({ engineRunning: false, ignition: false, rpm: 0 });
    } else {
        set({ ignition: true, msg: "SYSTEM CHECK..." });
        setTimeout(() => set({ msg: "STARTING..." }), 500);
        setTimeout(() => {
            if(get().ignition) set({ engineRunning: true, rpm: 800, msg: null });
        }, 1500);
    }
  },

  updatePhysics: (dt) => {
    const s = get();
    if (!s.ignition) return;

    // --- КОНСТАНТЫ ---
    const maxRPM = 8000;
    const idle = 800 + Math.random() * 50;
    const powerMult = s.nitro ? 2.5 : 1.0;
    
    // --- 1. ОБОРОТЫ (RPM) ---
    let targetRPM = idle;
    if (s.engineRunning) {
        // Если нейтраль (gear 0) или сцепление выжато - крутится легко
        // Под нагрузкой (едем) - зависит от скорости и передачи
        const load = clamp(s.speed / 280, 0, 1);
        
        // Газ раскручивает
        targetRPM += s.gas * 7200 * powerMult;
        
        // Нагрузка душит обороты
        if (s.speed > 5) {
             // Связь колес и мотора
             const wheelRPM = (s.speed / 280) * 7000 * (6.0 / s.gear); 
             // Эмуляция гидротрансформатора (мягкая связь)
             targetRPM = (targetRPM * 0.4) + (wheelRPM * 0.6);
        }
    }
    
    // Инерция стрелки
    let newRPM = lerp(s.rpm, targetRPM, dt * 3);
    if (newRPM > 7500) newRPM = 7400 + Math.random() * 100; // Отсечка

    // --- 2. КОРОБКА ---
    let nextGear = s.gear;
    if (newRPM > 7000 && s.gear < 6) {
        nextGear++;
        newRPM -= 2500;
    } else if (newRPM < 1500 && s.gear > 1 && s.speed > 10) {
        nextGear--;
        newRPM += 1000;
    }

    // --- 3. СКОРОСТЬ (ХАРДКОР) ---
    // Мощность падает на высоких передачах
    let torque = (s.gas * 400 * powerMult) / nextGear; 
    
    // Сопротивление воздуха (Квадратичное!)
    // До 100 км/ч почти не влияет. После 120 - стена.
    let drag = (s.speed * s.speed) * 0.006; 
    
    // Тормоза
    let brakeForce = s.brake * 1000;
    
    let accel = torque - drag - brakeForce - 2; // -2 трение качения

    let newSpeed = s.speed + (accel * dt * 0.5);
    
    // Хард кап 280
    if (newSpeed > 280) newSpeed = 280;
    if (newSpeed < 0) newSpeed = 0;

    // --- 4. FX ---
    // Турбина дует если газ > 50%
    let targetTurbo = (s.gas > 0.5 && s.rpm > 3000) ? 1 : 0;
    let shake = (newSpeed / 350) + (s.nitro ? 0.05 : 0);

    set({
        rpm: newRPM,
        speed: newSpeed,
        gear: nextGear,
        turbo: lerp(s.turbo, targetTurbo, dt),
        dist: s.dist + (newSpeed * dt * 0.001),
        shake: shake,
        // Температура растет если топить
        temp: Math.min(120, s.temp + (s.rpm > 6000 ? dt : -dt*0.1))
    });
  }
}));

