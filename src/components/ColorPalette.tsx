'use client';

interface ColorPaletteProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
  vertical?: boolean;
  colorSize?: number;
}

export default function ColorPalette({ colors, selectedColor, onColorSelect, vertical = false, colorSize = 40 }: ColorPaletteProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg lg:rounded-xl shadow-lg lg:shadow-xl p-3 sm:p-4 lg:p-6 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
      <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 text-center">
        <span className="flex items-center justify-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-red-500 to-blue-500"></div>
          <span className="hidden sm:inline">Color Palette</span>
          <span className="sm:hidden">Colors</span>
        </span>
      </div>
      <div className={`grid gap-2 sm:gap-3 ${vertical ? 'grid-cols-2' : 'grid-cols-4 md:grid-cols-8'}`}>
        {colors.map((color) => (
          <button
            key={color}
            className={`group relative rounded-md sm:rounded-lg border-2 sm:border-3 transition-all duration-300 transform hover:scale-110 hover:rotate-2 hover:shadow-lg ${
              selectedColor === color
                ? 'border-indigo-500 shadow-lg scale-110 ring-2 ring-indigo-200 dark:ring-indigo-800'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            style={{ 
              backgroundColor: color,
              width: `${colorSize}px`,
              height: `${colorSize}px`
            }}
            onClick={() => onColorSelect(color)}
            aria-label={`Color ${color}`}
          >
            {selectedColor === color && (
              <div className="absolute inset-0 rounded-md sm:rounded-lg flex items-center justify-center">
                <div 
                  className="rounded-full bg-white dark:bg-gray-900 shadow-lg border border-gray-300 dark:border-gray-600"
                  style={{
                    width: `${Math.max(8, colorSize * 0.2)}px`,
                    height: `${Math.max(8, colorSize * 0.2)}px`
                  }}
                ></div>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">Selected Color</div>
        <div className="flex items-center justify-center gap-2">
          <div 
            className="rounded border-2 border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0" 
            style={{ 
              backgroundColor: selectedColor,
              width: `${Math.max(16, colorSize * 0.4)}px`,
              height: `${Math.max(16, colorSize * 0.4)}px`
            }}
          ></div>
          <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{selectedColor}</span>
        </div>
      </div>
    </div>
  );
}