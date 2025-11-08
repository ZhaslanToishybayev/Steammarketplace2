import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        p-3 rounded-xl
        transition-all duration-300
        ${isDark
          ? 'bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-white/30'
          : 'bg-gradient-to-br from-black/5 to-black/10 hover:from-black/10 hover:to-black/15 border border-black/20 hover:border-black/30'
        }
        shadow-lg hover:shadow-xl
        transform hover:scale-105
        group
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {/* Background gradient animation */}
      <div className={`
        absolute inset-0 rounded-xl
        transition-all duration-500
        ${isDark
          ? 'bg-gradient-to-br from-orange-500/20 via-pink-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100'
          : 'bg-gradient-to-br from-yellow-400/20 via-orange-400/20 to-red-400/20 opacity-0 group-hover:opacity-100'
        }
      `} />

      {/* Icon container with rotation animation */}
      <div className="relative z-10 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400 transition-all duration-300 group-hover:rotate-180" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600 transition-all duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {/* Subtle glow effect */}
      <div className={`
        absolute -inset-1 rounded-xl blur
        transition-opacity duration-300
        ${isDark ? 'bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-violet-500/30' : 'bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-red-400/30'}
        ${isDark ? 'opacity-0 group-hover:opacity-50' : 'opacity-0 group-hover:opacity-40'}
      `} />
    </button>
  );
}
