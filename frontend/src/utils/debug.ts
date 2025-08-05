const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true';

export const debug = {
  log: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDebugMode) {
      console.warn('[DEBUG]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDebugMode) {
      console.error('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDebugMode) {
      console.info('[DEBUG]', ...args);
    }
  },
  
  isEnabled: () => isDebugMode,
};