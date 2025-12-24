import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';

export function SmokeSystem() {
  const count = 50; // Количество частиц
  const mesh = useRef();
  const { smoke } = useStore();

  // Инициализация частиц
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 2, // Разброс по ширине
        y: -10, // Спрятаны под землей изначально
        z: -3 + Math.random() * -2, // Чуть впереди камеры
        scale: 0,
        speed: 0.02 + Math.random() * 0.05,
        offset: Math.random() * 100
      });
    }
    return temp;
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state) => {
    if (!mesh.current) return;
    
    // Если дыма нет - прячем всё
    if (smoke <= 0.01) {
        mesh.current.visible = false;
        return;
    }
    mesh.current.visible = true;

    particles.forEach((p, i) => {
      // Анимация подъема
      p.y += p.speed;
      p.scale += 0.02;
      
      // Сброс частицы
      if (p.y > 2 || p.scale > 2) {
         p.y = -1.5; // Уровень капота
         p.scale = 0.1;
         p.x = (Math.random() - 0.5) * 3;
      }

      // Позиционирование
      dummy.position.set(p.x, p.y, p.z);
      
      // Дым всегда смотрит на камеру (Billboard)
      dummy.rotation.copy(state.camera.rotation);
      
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
    
    // Цвет дыма меняется (Белый -> Серый)
    // В данном случае используем материал.
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial 
        color="#ccc" 
        transparent 
        opacity={0.3} 
        depthWrite={false}
      />
    </instancedMesh>
  );
}
