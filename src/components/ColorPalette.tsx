'use client';

interface ColorPaletteProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
  vertical?: boolean;
}

export default function ColorPalette({ colors, selectedColor, onColorSelect, vertical = false }: ColorPaletteProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
        <span className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-blue-500"></div>
          Color Palette
        </span>
      </div>
      <div className={`grid gap-2 sm:gap-3 ${vertical ? 'grid-cols-2' : 'grid-cols-4 md:grid-cols-8'}`}>
        {colors.map((color) => (
          <button
            key={color}
            className={`group relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 sm:border-3 transition-all duration-300 transform hover:scale-110 hover:rotate-2 hover:shadow-lg ${
              selectedColor === color
                ? 'border-indigo-500 shadow-lg scale-110 ring-2 ring-indigo-200 dark:ring-indigo-800'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(color)}
            aria-label={`Color ${color}`}
          >
            {selectedColor === color && (
              <div className="absolute inset-0 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white dark:bg-gray-900 shadow-lg border border-gray-300 dark:border-gray-600"></div>
              </div>
            )}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded">
              {color}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">Selected</div>
        <div className="flex items-center justify-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600" 
            style={{ backgroundColor: selectedColor }}
          ></div>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{selectedColor}</span>
        </div>
      </div>
    </div>
  );
}