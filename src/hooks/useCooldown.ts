'use client';

import { useState, useCallback, useEffect } from 'react';

// const COOLDOWN_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const COOLDOWN_DURATION = 5 * 1000; // 5 seconds in milliseconds for testing
const STORAGE_KEY = 'pixeltogether-last-placement';

export function useCooldown() {
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(0);
  const [canPlace, setCanPlace] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastPlacement = localStorage.getItem(STORAGE_KEY);
      if (lastPlacement) {
        const lastPlacementTime = parseInt(lastPlacement, 10);
        const endTime = lastPlacementTime + COOLDOWN_DURATION;
        const now = Date.now();
        
        if (now < endTime) {
          setCooldownEndTime(endTime);
          setCanPlace(false);
        }
      }
    }
  }, []);

  const startCooldown = useCallback(() => {
    const now = Date.now();
    const endTime = now + COOLDOWN_DURATION;
    
    setCooldownEndTime(endTime);
    setCanPlace(false);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, now.toString());
    }
  }, []);

  const endCooldown = useCallback(() => {
    setCooldownEndTime(0);
    setCanPlace(true);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    canPlace,
    cooldownEndTime,
    startCooldown,
    endCooldown
  };
}