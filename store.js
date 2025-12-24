import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Inputs
  gas: 0,
  brake: 0,
  
  // Physics State
  rpm: 800, // Idle
  speed: 0,
  gear: 1,
  distance: 0,
  isEngineOn: false,
  
  // Actions
  setGas: (val) => set({ gas: val }),
  setBrake: (val) => set({ brake: val }),
  toggleEngine: () => set((state) => ({ isEngineOn: !state.isEngineOn })),
  
  // Physics Tick (вызывается каждый кадр внутри компонента)
  updatePhysics: (delta) => {
    const { gas, brake, rpm, speed, gear, isEngineOn } = get();
    if (!isEngineOn) return;

    // Constants for "Old Car" feel
    const maxRPM = 7000;
    const idleRPM = 800;
    const gearRatios = [0, 3.5, 2.5, 1.8, 1.4, 1.0]; // 1st to 5th
    const finalDrive = 3.8;
    
    // 1. Calculate Target RPM based on Gas
    // Если газ нажат, RPM стремится вверх. Если нет - падает.
    let targetRPM = gas > 0 ? lerp(rpm, maxRPM, gas * delta * 2) : lerp(rpm, idleRPM, delta * 0.5);
    
    // 2. Load from Speed (Engine braking / Load)
    // Реальная скорость влияет на RPM (сцепление)
    const wheelCircumference = 2; // meters
    const speedInRPM = (speed / 60) * gearRatios[gear] * finalDrive * 60; // rough conversion
    
    // Смешиваем "холостые" обороты и обороты от колес
    let actualRPM = Math.max(idleRPM, targetRPM);
    
    // Shift Logic (Automatic)
    let newGear = gear;
    if (actualRPM > 6000 && gear < 5) {
        newGear = gear + 1;
        actualRPM = 4000; // Drop RPM on shift
    } else if (actualRPM < 2000 && gear > 1) {
        newGear = gear - 1;
        actualRPM = 3500; // Rev match
    }

    // 3. Calculate Speed
    // Acceleration force depends on Torque (simplified as RPM curve)
    const torque = (actualRPM > 1000 && actualRPM < 5000) ? 1.0 : 0.7;
    const acceleration = (gas * torque * 50) / newGear; // Less accel at high gears
    const deceleration = (brake * 80) + (speed * 0.05); // Drag + Brakes

    let newSpeed = speed + (acceleration - deceleration) * delta;
    newSpeed = Math.max(0, newSpeed);

    set({ 
      rpm: actualRPM + (Math.random() - 0.5) * 50, // Micro jitter
      speed: newSpeed, 
      gear: newGear,
      distance: get().distance + newSpeed * delta
    });
  }
}));

// Helper
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}
