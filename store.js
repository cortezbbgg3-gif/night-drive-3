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
  cranking: false,
  running: false,
  broken: false, // Сломан ли двигатель
  lights: false,

  // Stats
  rpm: 0,
  speed: 0,
  gear: 1,
  temp: 20, // Холодный старт
  turbo: 0,
  odometer: 1542,
  
  // Visuals
  shake: 0,
  smoke: 0,      // Дым
  roadCurve: 0,
  msg: "",       // Сообщения

  // Actions
  setGas: (v) => set({ gas: clamp(v, 0, 1) }),
  setBrake: (v) => set({ brake: clamp(v, 0, 1) }),
  setNitro: (v) => set({ nitro: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.broken) {
        set({ msg: "ENGINE DAMAGED" });
        return;
    }
    if (s.running || s.cranking) {
        set({ running: false, cranking: false, ignition: false, rpm: 0, turbo: 0, msg: "" });
    } else {
        set({ ignition: true, cranking: true, msg: "" });
        // Если холодно, крутим дольше
        let time = s.temp < 40 ? 1500 : 800;
        setTimeout(() => {
            const curr = get();
            if (curr.ignition && !curr.broken) {
                set({ cranking: false, running: true, rpm: 900, msg: "" });
            }
        }, time);
    }
  },

  updatePhysics: (dt) => {
    const s = get();
    
    // 0. МЕРТВЫЙ ДВИГАТЕЛЬ
    if (s.broken || (!s.running && !s.cranking)) {
       set({ 
           rpm: Math.max(0, s.rpm - 1500 * dt),
           speed: Math.max(0, s.speed - 5 * dt),
           temp: Math.max(20, s.temp - 1 * dt),
           smoke: Math.max(0, s.smoke - 0.5 * dt)
       });
       return;
    }

    // 1. СТАРТЕР
    if (s.cranking) {
        set({ rpm: 200 + Math.random() * 100, shake: 0.02 });
        return;
    }

    // 2. ДВИГАТЕЛЬ
    const idleRPM = 900 + (Math.random() * 40);
    const isBurnout = s.brake > 0.1 && s.gas > 0.1;

    // Расчет крутящего момента (Torque)
    let torque = s.gas * (s.nitro ? 2.2 : 1.0);
    
    // РЕАЛИЗМ: Чем выше скорость, тем тяжелее разгонять (Aerodynamic Drag Simulation)
    if (s.speed > 120) torque *= 0.7; 
    if (s.speed > 180) torque *= 0.5;
    if (s.speed > 240) torque *= 0.3;

    let targetRPM = idleRPM;
    
    // Логика передач и сцепления
    if (s.gear === 0) {
        targetRPM += s.gas * 7200;
    } else {
        if (isBurnout) {
            targetRPM = 4500 + (s.gas * 3000);
        } else {
            // Обороты привязаны к колесам
            const ratios = [0, 3.8, 2.4, 1.8, 1.3, 1.0, 0.8];
            const ratio = ratios[s.gear] || 1;
            const wheelRPM = (s.speed * ratio) * 28; 
            
            targetRPM = Math.max(idleRPM, wheelRPM);

            // ГЛОХНЕТ (Stall)
            if (s.speed < 5 && s.gear > 0 && s.brake > 0.5 && s.gas < 0.2) {
                targetRPM = 0;
                set({ msg: "STALLING..." });
                if (s.rpm < 300) set({ running: false, ignition: false, msg: "STALLED" });
            } else {
                if (s.msg === "STALLING...") set({ msg: "" });
            }
        }
    }

    let newRPM = lerp(s.rpm, targetRPM, dt * 3.0);
    if (newRPM > 7500) newRPM = 7400 + Math.random() * 200; // Отсечка

    // Переключение передач (АКПП)
    let nextGear = s.gear;
    if (newRPM > 7100 && s.gear < 6 && !isBurnout) {
        nextGear++;
        newRPM -= 2500;
    } else if (newRPM < 2000 && s.gear > 1) {
        nextGear--;
        newRPM += 1200;
    }

    // 3. СКОРОСТЬ (DRAG PHYSICS)
    const hp = 320; 
    const mass = 1500; 
    
    // Сила тяги
    let driveForce = (torque * hp * 25);
    
    // Сопротивление воздуха (КВАДРАТИЧНОЕ!) - это не дает быстро ехать после 120
    let drag = (s.speed * s.speed) * 0.085; 
    let friction = 200;
    let brakeForce = s.brake * 4000;

    let totalForce = driveForce - drag - friction;
    if (!isBurnout) totalForce -= brakeForce;
    else totalForce = 0; // На бернауте скорость 0

    let accel = totalForce / mass;
    let newSpeed = s.speed + (accel * dt * 3.6); 

    if (newSpeed < 0) newSpeed = 0;
    if (newSpeed > 280) newSpeed = 280; // Hard cap

    // 4. ТЕМПЕРАТУРА И ДЫМ
    let heat = (s.rpm / 6000) * 3;
    if (isBurnout) heat += 40; // Мгновенный перегрев
    if (s.nitro) heat += 10;
    let cool = s.speed * 0.15; // Обдув
    
    let targetTemp = 90 + heat - cool;
    let newTemp = lerp(s.temp, targetTemp, dt * 0.1);

    // Расчет дыма
    let newSmoke = 0;
    if (newTemp > 115) newSmoke = (newTemp - 115) / 15;
    if (isBurnout) newSmoke = Math.max(newSmoke, 1.0);

    // ВЗРЫВ
    if (newTemp > 135) {
        set({ broken: true, running: false, smoke: 1.0, msg: "ENGINE BLOWN" });
    }

    // 5. FX
    let targetTurbo = (s.gas > 0.5 && s.rpm > 3000) ? 1.0 : 0.0;
    const time = Date.now() / 4000;
    const curve = Math.sin(time) * 25; // Изгиб дороги

    set({
        rpm: newRPM,
        speed: newSpeed,
        gear: nextGear,
        temp: newTemp,
        smoke: newSmoke,
        turbo: lerp(s.turbo, targetTurbo, dt),
        roadCurve: curve,
        odometer: s.odometer + (newSpeed * dt * 0.00027),
        shake: (newSpeed / 400) + (isBurnout ? 0.05 : 0) + (s.nitro ? 0.1 : 0)
    });
  }
}));

