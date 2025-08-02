'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CANVAS_SIZES = [
  { size: 8, path: '/8' },
  { size: 16, path: '/16' },
  { size: 32, path: '/32' },
  { size: 64, path: '/' },
  { size: 128, path: '/128' },
  { size: 256, path: '/256' },
  { size: 512, path: '/512' },
];

export default function CanvasSizeSelector() {
  const pathname = usePathname();
  
  return (
    <div className="flex items-center gap-1">
      {CANVAS_SIZES.map(({ size, path }) => {
        const isActive = 
          (path === '/' && pathname === '/') || 
          (path !== '/' && pathname === path);
        
        return (
          <Link
            key={size}
            href={path}
            className={`
              px-2 py-1 text-xs font-medium rounded-md transition-colors
              ${isActive 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {size}×{size}
          </Link>
        );
      })}
    </div>
  );
}