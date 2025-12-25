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
  broken: false,
  lights: false,
  
  // Stats
  rpm: 0,
  speed: 0,     // km/h
  gear: 1,
  temp: 20,     // Celsius (Start cold)
  turbo: 0,     // Pressure
  odometer: 1542,
  
  // Visuals
  shake: 0,
  roadCurve: 0,
  msg: "",      // Messages

  // Actions
  setGas: (v) => set({ gas: clamp(v, 0, 1) }),
  setBrake: (v) => set({ brake: clamp(v, 0, 1) }),
  setNitro: (v) => set({ nitro: v }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  toggleIgnition: () => {
    const s = get();
    if (s.broken) return;

    if (s.running || s.cranking) {
        // Stop
        set({ running: false, cranking: false, ignition: false, rpm: 0, turbo: 0 });
    } else {
        // Start Sequence
        set({ ignition: true, cranking: true, msg: "" });
        
        // Стартер крутит 1.2 сек, если холодно - дольше
        let crankTime = s.temp < 40 ? 2000 : 1000;
        
        setTimeout(() => {
            const curr = get();
            if (curr.ignition && !curr.broken) {
                set({ cranking: false, running: true, rpm: 900 });
            }
        }, crankTime);
    }
  },

  // --- PHYSICS LOOP (60Hz) ---
  updatePhysics: (dt) => {
    const s = get();
    
    // 0. Dead Engine
    if (s.broken || (!s.running && !s.cranking)) {
       set({ 
           rpm: Math.max(0, s.rpm - 1500 * dt),
           speed: Math.max(0, s.speed - 5 * dt),
           temp: Math.max(20, s.temp - 0.5 * dt)
       });
       return;
    }

    // 1. Cranking
    if (s.cranking) {
        set({ rpm: 250 + Math.random() * 50, shake: 0.02 });
        return;
    }

    // 2. Engine Logic
    const maxRPM = 8000;
    const idleRPM = 900 + (Math.random() * 30);
    const isBurnout = s.brake > 0.1 && s.gas > 0.1;

    // Power Calculation
    // Чем быстрее едем, тем меньше тяги (реализм)
    let torque = s.gas * (s.nitro ? 2.0 : 1.0);
    if (s.speed > 120) torque *= 0.6; // Тяжело после 120
    if (s.speed > 200) torque *= 0.4; // Очень тяжело после 200

    let targetRPM = idleRPM;
    
    // Gear Logic (Manual/Auto hybrid)
    if (s.gear === 0) {
        targetRPM += s.gas * 7000;
    } else {
        // RPM is locked to speed unless burnout/clutch slip
        if (isBurnout) {
            targetRPM = 4000 + (s.gas * 3500);
        } else {
            // RPM based on speed and gear ratio
            // Gear Ratios: 1=3.5, 2=2.0, 3=1.4, 4=1.0, 5=0.8, 6=0.6
            const ratios = [0, 3.5, 2.2, 1.6, 1.2, 0.9, 0.7];
            const ratio = ratios[s.gear] || 1;
            // Formula: Speed -> RPM
            const wheelRPM = (s.speed * ratio) * 25; 
            
            // Если сцепление (power) есть, стремимся к wheelRPM, но не ниже idle
            targetRPM = Math.max(idleRPM, wheelRPM);
            
            // Если стоим и газуем - Stall check (Глохнет)
            if (s.speed < 5 && s.gear > 0 && s.brake > 0.5 && s.gas < 0.2) {
                targetRPM = 0; // Stall
                if (s.rpm < 300) set({ running: false, ignition: false, msg: "STALLED" });
            }
        }
    }

    // RPM Inertia
    let newRPM = lerp(s.rpm, targetRPM, dt * 3.0);
    if (newRPM > 7500) newRPM = 7400 + Math.random() * 200; // Limiter

    // Shifting
    let nextGear = s.gear;
    if (newRPM > 7000 && s.gear < 6 && !isBurnout) {
        nextGear++;
        newRPM -= 2500;
    } else if (newRPM < 2000 && s.gear > 1) {
        nextGear--;
        newRPM += 1000;
    }

    // 3. Speed & Drag
    // 300 HP engine logic
    const hp = 300;
    const mass = 1500; // kg
    
    // Force = Power / Speed (simplified)
    let driveForce = (torque * hp * 20); 
    
    // Aerodynamic Drag (Resistance increases with square of speed)
    // ЭТО ДЕЛАЕТ РАЗГОН ПОСЛЕ 120 МЕДЛЕННЫМ
    let drag = (s.speed * s.speed) * 0.06; 
    let friction = 150;
    let brakeForce = s.brake * 3000;

    let totalForce = driveForce - drag - friction;
    if (!isBurnout) totalForce -= brakeForce;
    else totalForce = 0; // Burnout = no speed gain

    let accel = totalForce / mass;
    let newSpeed = s.speed + (accel * dt * 3.6); // Convert m/s^2 to km/h step
    
    if (newSpeed < 0) newSpeed = 0;
    if (newSpeed > 280) newSpeed = 280; // Hard cap

    // 4. Heat & Damage
    let heat = (s.rpm / 6000) * 4;
    if (isBurnout) heat += 30;
    if (s.nitro) heat += 15;
    
    // Cooling (Wind)
    let cool = s.speed * 0.1;
    let targetTemp = 90 + heat - cool;
    let newTemp = lerp(s.temp, targetTemp, dt * 0.1);

    if (newTemp > 130) {
        set({ broken: true, running: false, msg: "ENGINE BLOWN" });
    }

    // 5. FX
    let targetTurbo = (s.gas > 0.5 && s.rpm > 3000) ? 1.0 : 0.0;
    // Road Curve generator
    const time = Date.now() / 3000;
    const curve = Math.sin(time) * 30;

    set({
        rpm: newRPM,
        speed: newSpeed,
        gear: nextGear,
        temp: newTemp,
        turbo: lerp(s.turbo, targetTurbo, dt),
        roadCurve: curve,
        odometer: s.odometer + (newSpeed * dt * 0.00027),
        shake: (newSpeed / 300) + (isBurnout ? 0.05 : 0) + (s.nitro ? 0.1 : 0)
    });
  }
}));

