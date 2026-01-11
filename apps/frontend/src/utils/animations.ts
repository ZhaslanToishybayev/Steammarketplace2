import { Variants } from 'framer-motion';

// Animation durations
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  pulse: 2,
} as const;

// Stagger delay
export const STAGGER_DELAY = 0.05;

// Spring configurations
export const SPRING_CONFIG = {
  default: { type: 'spring', stiffness: 400, damping: 17 } as const,
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as const,
  wobbly: { type: 'spring', stiffness: 150, damping: 10 } as const,
  stiff: { type: 'spring', stiffness: 600, damping: 30 } as const,
} as const;

// Common animation variants
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: ANIMATION_DURATION.normal },
  },
  exit: { opacity: 0, transition: { duration: ANIMATION_DURATION.fast } },
} as const;

export const slideVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeIn',
    },
  },
} as const;

export const slideUpVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    },
  },
  exit: {
    y: 30,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeIn',
    },
  },
} as const;

export const slideDownVariants = {
  hidden: { y: -30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    },
  },
} as const;

export const slideLeftVariants = {
  hidden: { x: 30, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
} as const;

export const slideRightVariants = {
  hidden: { x: -30, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
} as const;

export const scaleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeIn',
    },
  },
} as const;

export const scaleInVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
} as const;

// Stagger animations
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY,
      delayChildren: STAGGER_DELAY * 2,
    },
  },
} as const;

export const staggerItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      duration: ANIMATION_DURATION.normal,
    },
  },
} as const;

export const staggerFadeVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
} as const;

// Page transitions
export const pageTransitionVariants = {
  initial: { opacity: 0, x: '100%' },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: '-100%',
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeIn',
    },
  },
} as const;

export const pageTransitionVariantsLeft = {
  initial: { opacity: 0, x: '-100%' },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: '100%',
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeIn',
    },
  },
} as const;

// Modal transitions
export const modalTransitionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeIn',
    },
  },
} as const;

// Drawer transitions
export const drawerTransitionVariants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: 'easeOut',
    },
  },
  exit: {
    x: '100%',
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeIn',
    },
  },
} as const;

// Button and interaction variants
export const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: ANIMATION_DURATION.fast,
      type: 'spring',
      stiffness: 400,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: ANIMATION_DURATION.fast,
    },
  },
} as const;

export const cardVariants = {
  hover: {
    y: -4,
    scale: 1.01,
    transition: {
      duration: ANIMATION_DURATION.normal,
      type: 'spring',
      stiffness: 400,
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: ANIMATION_DURATION.fast,
    },
  },
} as const;

export const glowVariants = {
  pulse: {
    boxShadow: [
      '0 0 10px currentColor',
      '0 0 20px currentColor, 0 0 30px currentColor',
      '0 0 10px currentColor',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
} as const;

// Custom easing functions
export const easing = {
  easeInOutCubic: [0.645, 0.045, 0.355, 1.000] as const,
  easeInOutQuart: [0.77, 0, 0.175, 1] as const,
  easeOutBack: [0.34, 1.56, 0.64, 1] as const,
  easeInBack: [0.6, -0.28, 0.735, 0.045] as const,
} as const;

// Utility functions
export function createStaggerAnimation(delay: number): Variants {
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.normal,
        delay: delay,
      },
    },
  };
}

export function createSlideAnimation(direction: 'up' | 'down' | 'left' | 'right'): Variants {
  const translations = {
    up: { y: [-20, 0] },
    down: { y: [20, 0] },
    left: { x: [-20, 0] },
    right: { x: [20, 0] },
  };

  return {
    hidden: { ...translations[direction], opacity: 0 },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.normal,
        ease: 'easeOut',
      },
    },
  };
}

export function createFadeAnimation(duration: number): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration,
      },
    },
  };
}

export function getRandomDelay(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Animation presets for common use cases
export const animationPresets = {
  fadeIn: fadeVariants,
  slideUp: slideUpVariants,
  staggerFade: staggerFadeVariants,
  staggerContainer: staggerContainerVariants,
  staggerItem: staggerItemVariants,
  modal: modalTransitionVariants,
  button: buttonVariants,
  card: cardVariants,
  glow: glowVariants,
} as const;