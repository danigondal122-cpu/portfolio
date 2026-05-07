import { useEffect, useRef } from 'react';
import { ParticleSystem } from '../utils/ParticleSystem';

export function useParticleSystem(containerRef, imagePaths, config) {
  const psRef = useRef(null);
  const instanceId = useRef(0);

useEffect(() => {
  const id = ++instanceId.current;
 
  if (!containerRef.current) return;
  if (psRef.current) return; // 🔥 PREVENT MULTIPLE INSTANCES

  const validEntries = Object.entries(imagePaths).filter(([_, src]) => src);
  if (validEntries.length === 0) return;

  const loaded = {};
  let count = 0;

  validEntries.forEach(([key, src]) => {
    const img = new Image();

    img.onload = () => {
        if (id !== instanceId.current) return;
      loaded[key] = img;
      count++;

      if (count === validEntries.length) {
        psRef.current = new ParticleSystem(
          containerRef.current,
          loaded,
          config
        );
      }
    };

    img.src = src;
  });

  return () => {
    psRef.current?.destroy();
    psRef.current = null;
  };
}, [containerRef, imagePaths, config]);

  return psRef;
}