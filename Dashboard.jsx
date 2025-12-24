import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useStore } from './store';
import * as THREE from 'three';

// Компонент одного прибора (Gauge)
const Gauge = ({ position, value, max, label, color = "white", type = "big" }) => {
  const needleRef = useRef();
  
  useFrame(() => {
    if (needleRef.current) {
      // Конвертируем значение в угол (от -2.2 до +0.5 радианов)
      const pct = Math.min(value / max, 1.1); // Чуть больше 1 для перегрузок
      const angle = -2.2 + (pct * 3.4); // Рабочий ход стрелки
      
      // Плавность движения стрелки
      needleRef.current.rotation.z = THREE.MathUtils.lerp(needleRef.current.rotation.z, angle, 0.1);
    }
  });

  const scale = type === 'big' ? 1 : 0.6;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* 1. Корпус колодца (Rim) */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[0.9, 1.05, 64]} />
        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 2. Подложка (Циферблат) */}
      <mesh position={[0, 0, -0.15]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#050505" />
      </mesh>

      {/* 3. Штрихи (Ticks) - Процедурно */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = -2.2 + (i / 10) * 3.4;
        return (
           <mesh key={i} position={[0.75 * Math.cos(a), 0.75 * Math.sin(a), -0.14]} rotation={[0, 0, a]}>
              <planeGeometry args={[0.1, 0.03]} />
              <meshBasicMaterial color={i > 8 && label === "RPM" ? "red" : "white"} />
           </mesh>
        )
      })}

      {/* 4. Текст */}
      <Text position={[0, -0.4, -0.14]} fontSize={0.2} color={color} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">
        {label}
      </Text>

      {/* 5. Стрелка (Needle) */}
      <group ref={needleRef} position={[0, 0, -0.12]}>
          <mesh position={[0.35, 0, 0]} rotation={[0,0,0]}>
             <boxGeometry args={[0.7, 0.04, 0.01]} />
             <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0,0,0]}>
             <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} rotation={[Math.PI/2, 0, 0]} />
             <meshStandardMaterial color="#111" />
          </mesh>
      </group>
      
      {/* 6. Стекло (Glass Cover) */}
      <mesh position={[0, 0, 0.05]}>
          <circleGeometry args={[0.9, 32]} />
          <meshPhysicalMaterial 
            transparent 
            opacity={0.15} 
            roughness={0} 
            metalness={0.9} 
            clearcoat={1} 
            color="#aaf"
          />
      </mesh>
    </group>
  );
};

export function Dashboard() {
  const { rpm, speed, engineTemp, lightsOn } = useStore();
  const group = useRef();

  useFrame((state) => {
    // Вибрация двигателя
    if (group.current) {
        const vibration = (rpm / 100000) * (Math.random() - 0.5);
        group.current.position.y = -1.5 + vibration;
        group.current.position.x = vibration;
    }
  });

  return (
    <group ref={group} position={[0, -1.5, -2]}>
        
        {/* Торпедо (Основа) */}
        <mesh position={[0, 0.2, -1]} receiveShadow>
            {/* Сложная форма торпеды через вытягивание формы */}
            <cylinderGeometry args={[4, 5, 3, 64, 1, false, 0, Math.PI]} rotation={[0, Math.PI/2, Math.PI/2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
        </mesh>
        
        {/* Козырек над приборами */}
        <mesh position={[0, 1.2, 0]} rotation={[-0.5, 0, 0]}>
             <boxGeometry args={[5, 0.2, 2]} />
             <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>

        {/* Подсветка приборов (Включается кнопкой Light) */}
        <pointLight 
            position={[0, 0.5, 0.5]} 
            intensity={lightsOn ? 2.5 : 0} 
            color="#ffaa00" 
            distance={3} 
            decay={2}
        />

        {/* Приборы */}
        <Gauge position={[-1.2, 0.2, 0]} value={rpm} max={8000} label="RPM" />
        <Gauge position={[1.2, 0.2, 0]} value={speed} max={220} label="KM/H" />
        <Gauge position={[0, 0, 0]} value={engineTemp} max={130} label="TEMP" type="small" color={engineTemp > 110 ? "red" : "white"} />

    </group>
  );
}
