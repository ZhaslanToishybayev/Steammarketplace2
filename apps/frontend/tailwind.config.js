/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        steam: {
          blue: '#1bb2e9',
          black: '#1b263b',
          gray: '#414f6b',
          orange: '#ff8c00',
          green: '#4caf50',
        },
        rarity: {
          common: {
            50: '#f3f4f6',
            100: '#e5e7eb',
            200: '#d1d5db',
            300: '#9ca3af',
            400: '#6b7280',
            500: '#4b5563',
            600: '#374151',
            700: '#1f2937',
            800: '#111827',
            900: '#030712',
          },
          uncommon: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          rare: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          mythical: {
            50: '#f3e8ff',
            100: '#e9d5ff',
            200: '#d8b4fe',
            300: '#c084fc',
            400: '#a855f7',
            500: '#8b5cf6',
            600: '#7c3aed',
            700: '#6d28d9',
            800: '#5b21b6',
            900: '#4c1d95',
          },
          legendary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          ancient: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
          },
        },
        background: {
          DEFAULT: '#0a1128',
          secondary: '#1a2238',
          tertiary: '#2a3248',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0aec0',
          tertiary: '#718096',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'stagger-fade-in': 'staggerFadeIn 0.6s ease-out forwards',
        'slide-in-bottom': 'slideInBottom 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: 'none' },
          '50%': { boxShadow: '0 0 20px currentColor' },
        },
        staggerFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '32px',
      },
      backgroundColor: {
        'glass-light': 'rgba(255, 255, 255, 0.1)',
        'glass-dark': 'rgba(0, 0, 0, 0.3)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(27, 178, 233, 0.3)',
        'glow-orange': '0 0 20px rgba(255, 140, 0, 0.3)',
        'glow-green': '0 0 20px rgba(76, 175, 80, 0.3)',
        // Rarity glow effects
        'glow-common': '0 0 10px rgba(75, 85, 99, 0.4), 0 0 20px rgba(75, 85, 99, 0.2)',
        'glow-uncommon': '0 0 10px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)',
        'glow-rare': '0 0 10px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-mythical': '0 0 10px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.2)',
        'glow-legendary': '0 0 10px rgba(249, 115, 22, 0.4), 0 0 20px rgba(249, 115, 22, 0.2)',
        'glow-ancient': '0 0 10px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.2)',
        // Glow intensity variants
        'glow-sm': '0 0 5px currentColor',
        'glow-md': '0 0 15px currentColor',
        'glow-lg': '0 0 25px currentColor',
        'glow-xl': '0 0 35px currentColor',
        // Inner glow variants
        'inner-glow-common': 'inset 0 0 10px rgba(75, 85, 99, 0.3)',
        'inner-glow-uncommon': 'inset 0 0 10px rgba(34, 197, 94, 0.3)',
        'inner-glow-rare': 'inset 0 0 10px rgba(59, 130, 246, 0.3)',
        'inner-glow-mythical': 'inset 0 0 10px rgba(139, 92, 246, 0.3)',
        'inner-glow-legendary': 'inset 0 0 10px rgba(249, 115, 22, 0.3)',
        'inner-glow-ancient': 'inset 0 0 10px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    function ({ addUtilities }) {
      const newUtilities = {
        // Text glow utility
        '.text-glow': {
          textShadow: '0 0 10px currentColor',
        },
        '.text-glow-sm': {
          textShadow: '0 0 5px currentColor',
        },
        '.text-glow-lg': {
          textShadow: '0 0 20px currentColor',
        },
        // Card glass utility
        '.card-glass': {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        // Hover lift effect
        '.hover-lift': {
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        },
        '.hover-lift:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        },
        // Rarity glow utilities
        '.rarity-glow-common': {
          boxShadow: '0 0 10px rgba(75, 85, 99, 0.4)',
        },
        '.rarity-glow-uncommon': {
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
        },
        '.rarity-glow-rare': {
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
        },
        '.rarity-glow-mythical': {
          boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
        },
        '.rarity-glow-legendary': {
          boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)',
        },
        '.rarity-glow-ancient': {
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
  darkMode: 'class',
};