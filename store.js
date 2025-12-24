import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // User Inputs (0.0 - 1.0)
  gasInput: 0,
  brakeInput: 0,
  
  // Car Logic
  ignition: false,     // Зажигание (Электрика)
  engineRunning: false,// Двигатель заведен
  lights: false,
  
  // Physics Values
  rpm: 0,
  speed: 0,
  gear: 1,
  
  // Actions
  setGas: (val) => set({ gasInput: val }),
  setBrake: (val) => set({ brakeInput: val }),
  toggleLights: () => set(s => ({ lights: !s.lights })),
  
  startEngine: async () => {
    const s = get();
    if (s.engineRunning) {
        set({ engineRunning: false, ignition: false, rpm: 0 });
        return;
    }
    set({ ignition: true }); // Включаем приборы
    // Эмуляция стартера (через 1 сек заводится)
    setTimeout(() => {
        set({ engineRunning: true, rpm: 800 });
    }, 800);
  },

  updatePhysics: (dt) => {
    const s = get();
    
    // 1. RPM Logic
    let targetRPM = 0;
    if (s.engineRunning) {
        // Холостые + Газ
        const idle = 800 + (Math.random() * 50); // Легкое дыхание мотора
        const max = 7500;
        // Если сцепление (нейтраль или движение) - упростим для игры
        targetRPM = idle + (s.gasInput * (max - idle));
        
        // Отсечка
        if (targetRPM > 7200) targetRPM = 7100 + Math.random() * 200;
    }

    // Инерция стрелки тахометра (она не мгновенная)
    let newRPM = s.rpm + (targetRPM - s.rpm) * 5 * dt;

    // 2. Speed Logic
    // Скорость набирается, если есть RPM и передача
    const power = s.engineRunning ? (s.gasInput * 40) : 0;
    const brake = (s.brakeInput * 80) + 2; // +2 это трение качения
    
    let acceleration = power - brake;
    let newSpeed = s.speed + acceleration * dt;
    if (newSpeed < 0) newSpeed = 0;
    
    // Связь скорости и оборотов (Gear shift simulation)
    // Если скорость растет, а газ не нажат -> обороты падают медленнее
    
    set({ rpm: newRPM, speed: newSpeed });
  }
}));
