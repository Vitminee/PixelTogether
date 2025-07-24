'use client';

import { useState, useEffect } from 'react';

interface CooldownTimerProps {
  canPlace: boolean;
  cooldownEndTime: number;
  onCooldownEnd: () => void;
  size?: string;
}

export default function CooldownTimer({ canPlace, cooldownEndTime, onCooldownEnd, size }: CooldownTimerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    let wasActive = false;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, cooldownEndTime - now);
      
      setTimeLeft(remaining);
      setIsActive(remaining > 0);
      
      // Call onCooldownEnd when transitioning from active to inactive
      if (wasActive && remaining === 0) {
        onCooldownEnd();
      }
      
      wasActive = remaining > 0;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isMounted, cooldownEndTime, onCooldownEnd]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isMounted) {
    return (
      <div className="text-center">
        <div className={`${size || 'text-sm'} text-gray-500 dark:text-gray-400 mb-1 px-2 pt-3`}>
          Loading...
        </div>
        <div className="text-2xl font-mono font-bold text-gray-400">
          --:--
        </div>
        <div className="h-4 flex items-center justify-center mt-1">
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className={`${size || 'text-sm'} text-gray-500 dark:text-gray-400 mb-1 px-2 pt-3`}>
        {isActive ? 'Next pixel placement in:' : 'You can place a pixel!'}
      </div>
      <div className={`text-2xl font-mono font-bold transition-colors duration-300 ${
        isActive 
          ? 'text-red-600 dark:text-red-400' 
          : 'text-green-600 dark:text-green-400'
      }`}>
        {isActive ? formatTime(timeLeft) : '00:00'}
      </div>
      <div className="h-4 flex items-center justify-center mt-1">
      </div>
    </div>
  );
}