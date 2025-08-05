const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true';

export const debug = {
  log: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDebugMode) {
      console.warn('[DEBUG]', ...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (isDebugMode) {
      console.error('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDebugMode) {
      console.info('[DEBUG]', ...args);
    }
  },
  
  isEnabled: () => isDebugMode,
};