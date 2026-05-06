import React from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';

export const THEME_OPTIONS = [
  // Single Colors
  { name: 'Azul', primary: '#2563eb', isGradient: false },
  { name: 'Vermelho', primary: '#dc2626', isGradient: false },
  { name: 'Verde', primary: '#16a34a', isGradient: false },
  { name: 'Esmeralda', primary: '#059669', isGradient: false },
  { name: 'Índigo', primary: '#4f46e5', isGradient: false },
  { name: 'Violeta', primary: '#7c3aed', isGradient: false },
  { name: 'Roxo', primary: '#9333ea', isGradient: false },
  { name: 'Rosa', primary: '#db2777', isGradient: false },
  { name: 'Laranja', primary: '#ea580c', isGradient: false },
  { name: 'Âmbar', primary: '#d97706', isGradient: false },
  
  // Gradients
  { name: 'Oceano', primary: '#2563eb', secondary: '#4f46e5', isGradient: true },
  { name: 'Pôr do Sol', primary: '#ea580c', secondary: '#dc2626', isGradient: true },
  { name: 'Floresta', primary: '#059669', secondary: '#16a34a', isGradient: true },
  { name: 'Galáxia', primary: '#7c3aed', secondary: '#9333ea', isGradient: true },
  { name: 'Aurora', primary: '#0d9488', secondary: '#059669', isGradient: true },
  { name: 'Neon', primary: '#db2777', secondary: '#9333ea', isGradient: true },
  { name: 'Céu', primary: '#0ea5e9', secondary: '#2563eb', isGradient: true },
  { name: 'Fogo', primary: '#f97316', secondary: '#ef4444', isGradient: true },
  { name: 'Menta', primary: '#10b981', secondary: '#3b82f6', isGradient: true },
  { name: 'Lavanda', primary: '#8b5cf6', secondary: '#ec4899', isGradient: true },
];

interface ThemeSelectorProps {
  showDarkMode?: boolean;
  size?: number;
  customIcon?: string;
  scale?: number;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ showDarkMode = true, size = 20, customIcon, scale = 1 }) => {
  const { profile, updateTheme, globalSettings } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentTheme = {
    mode: profile?.theme?.mode || 'light',
    primaryColor: profile?.theme?.primaryColor || globalSettings?.globalTheme?.primaryColor || '#2563eb',
    secondaryColor: profile?.theme?.secondaryColor || globalSettings?.globalTheme?.secondaryColor,
    isGradient: profile?.theme?.isGradient ?? globalSettings?.globalTheme?.isGradient ?? false,
    backgroundImage: profile?.theme?.backgroundImage || globalSettings?.globalTheme?.backgroundImage
  };

  const handleToggleMode = () => {
    updateTheme({
      ...currentTheme,
      mode: currentTheme.mode === 'light' ? 'dark' : 'light'
    } as any);
  };

  const handleSelectTheme = (option: typeof THEME_OPTIONS[0]) => {
    const newTheme = {
      mode: currentTheme.mode,
      primaryColor: option.primary,
      secondaryColor: option.secondary,
      isGradient: option.isGradient,
      backgroundImage: currentTheme.backgroundImage
    };

    updateTheme(newTheme as any);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center overflow-hidden rounded-full"
        title="Personalizar Cores"
        style={{ 
          width: size + 12,
          height: size + 12,
          transform: `scale(${scale})`,
          color: globalSettings?.clientIcons?.color || undefined
        }}
      >
        {customIcon && customIcon.trim() !== '' ? (
          <img 
            src={customIcon} 
            alt="Theme" 
            style={{ width: size, height: size }} 
            className="object-contain w-full h-full" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <Palette 
            size={size} 
            className={isOpen ? "text-black" : "text-black dark:text-white"} 
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[110]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[120] overflow-hidden flex flex-col"
            >
              {showDarkMode && (
                <div className="p-1.5 px-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-white">Modo</span>
                  <button
                    onClick={handleToggleMode}
                    className="p-1 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {currentTheme.mode === 'light' ? <Moon size={10} className="text-slate-600" /> : <Sun size={10} className="text-amber-400" />}
                  </button>
                </div>
              )}

              <div className="p-2 flex flex-col gap-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-5 gap-1.5">
                  {THEME_OPTIONS.map((option, index) => {
                    const isSelected = currentTheme.primaryColor === option.primary && 
                                     currentTheme.secondaryColor === option.secondary &&
                                     currentTheme.isGradient === option.isGradient;
                    
                    return (
                      <button
                        key={option.name}
                        onClick={() => handleSelectTheme(option)}
                        className={`relative w-6 h-6 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm overflow-hidden ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-white dark:ring-offset-slate-900 scale-110' : ''
                        }`}
                        style={{
                          background: option.isGradient 
                            ? `linear-gradient(135deg, ${option.primary}, ${option.secondary})`
                            : option.primary
                        }}
                        title={option.name}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
