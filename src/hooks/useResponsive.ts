'use client';

import { useState, useEffect } from 'react';

interface ResponsiveValues {
  headerHeight: number;
  sidebarWidth: number;
  padding: number;
  titleSize: string;
  subtitleSize: string;
  colorSize: number;
  scale: number;
}

export function useResponsive(): ResponsiveValues {
  const [values, setValues] = useState<ResponsiveValues>({
    headerHeight: 80,
    sidebarWidth: 320,
    padding: 24,
    titleSize: 'text-2xl',
    subtitleSize: 'text-sm',
    colorSize: 40,
    scale: 1
  });

  useEffect(() => {
    const updateValues = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Calculate scale based on window size - more conservative scaling
      const baseWidth = 1200;
      const baseHeight = 800;
      const scaleX = width / baseWidth;
      const scaleY = height / baseHeight;
      const scale = Math.max(0.7, Math.min(scaleX, scaleY, 1.0));

      // Responsive breakpoints
      if (width < 640) { // Mobile
        setValues({
          headerHeight: Math.round(60 * scale),
          sidebarWidth: Math.round(240 * scale),
          padding: Math.round(12 * scale),
          titleSize: 'text-lg',
          subtitleSize: 'text-xs',
          colorSize: Math.round(32 * scale),
          scale
        });
      } else if (width < 768) { // Tablet
        setValues({
          headerHeight: Math.round(70 * scale),
          sidebarWidth: Math.round(280 * scale),
          padding: Math.round(16 * scale),
          titleSize: 'text-xl',
          subtitleSize: 'text-sm',
          colorSize: Math.round(36 * scale),
          scale
        });
      } else if (width < 1024) { // Small desktop
        setValues({
          headerHeight: Math.round(80 * scale),
          sidebarWidth: Math.round(300 * scale),
          padding: Math.round(20 * scale),
          titleSize: 'text-xl',
          subtitleSize: 'text-sm',
          colorSize: Math.round(38 * scale),
          scale
        });
      } else { // Large desktop
        setValues({
          headerHeight: Math.round(80 * scale),
          sidebarWidth: Math.round(320 * scale),
          padding: Math.round(24 * scale),
          titleSize: 'text-2xl',
          subtitleSize: 'text-sm',
          colorSize: Math.round(40 * scale),
          scale
        });
      }
    };

    updateValues();
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateValues, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return values;
}