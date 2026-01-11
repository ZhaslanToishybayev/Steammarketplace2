'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Link2, Search, ShieldCheck, CreditCard, ArrowRightLeft, Trophy, History } from 'lucide-react';

interface Step {
    step: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
}

const steps: Step[] = [
    {
        step: '01',
        title: 'Connect Steam',
        desc: 'Secure OpenID authentication with your Steam account.',
        icon: <Link2 className="w-7 h-7" />,
        color: '#FF8C00'
    },
    {
        step: '02',
        title: 'Browse & Select',
        desc: 'Explore CS2 skins with filters for price and rarity.',
        icon: <Search className="w-7 h-7" />,
        color: '#22C55E'
    },
    {
        step: '03',
        title: 'Verify Items',
        desc: 'Automatic verification ensures item authenticity.',
        icon: <ShieldCheck className="w-7 h-7" />,
        color: '#8B5CF6'
    },
    {
        step: '04',
        title: 'Secure Payment',
        desc: 'Funds held in escrow until trade completion.',
        icon: <CreditCard className="w-7 h-7" />,
        color: '#3B82F6'
    },
    {
        step: '05',
        title: 'Complete Trade',
        desc: 'Accept trade offer and receive items instantly.',
        icon: <ArrowRightLeft className="w-7 h-7" />,
        color: '#F59E0B'
    },
    {
        step: '06',
        title: 'Trade History',
        desc: 'Track transactions and manage trading history.',
        icon: <History className="w-7 h-7" />,
        color: '#EC4899'
    },
];

export function StepsCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [direction, setDirection] = useState(0);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (!isAutoPlaying) return;

        const interval = setInterval(() => {
            setDirection(1);
            setActiveIndex((prev) => (prev + 1) % steps.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const goToNext = () => {
        setIsAutoPlaying(false);
        setDirection(1);
        setActiveIndex((prev) => (prev + 1) % steps.length);
    };

    const goToPrev = () => {
        setIsAutoPlaying(false);
        setDirection(-1);
        setActiveIndex((prev) => (prev - 1 + steps.length) % steps.length);
    };

    const goToStep = (index: number) => {
        setIsAutoPlaying(false);
        setDirection(index > activeIndex ? 1 : -1);
        setActiveIndex(index);
    };

    const currentStep = steps[activeIndex];

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut" as const,
            },
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -300 : 300,
            opacity: 0,
            scale: 0.8,
            transition: {
                duration: 0.5,
            },
        }),
    };

    return (
        <div className="relative max-w-2xl mx-auto">
            {/* Main Carousel Container */}
            <div
                className="relative h-[300px] flex items-center justify-center"
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
            >
                {/* Navigation Arrows */}
                <button
                    onClick={goToPrev}
                    className="absolute left-0 md:-left-20 top-1/2 -translate-y-1/2 z-20 w-14 h-14 flex items-center justify-center rounded-full glass-steam border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-[#FF8C00]/10 hover:border-[#FF8C00]/40 transition-all hover:scale-110"
                    aria-label="Previous step"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>

                <button
                    onClick={goToNext}
                    className="absolute right-0 md:-right-20 top-1/2 -translate-y-1/2 z-20 w-14 h-14 flex items-center justify-center rounded-full glass-steam border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-[#FF8C00]/10 hover:border-[#FF8C00]/40 transition-all hover:scale-110"
                    aria-label="Next step"
                >
                    <ChevronRight className="w-7 h-7" />
                </button>

                {/* Single Card Display */}
                <div className="w-full max-w-md px-4">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={activeIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="w-full"
                        >
                            <div
                                className="p-6 rounded-2xl text-center glass-steam border-2 transition-all duration-500"
                                style={{
                                    borderColor: `${currentStep.color}40`,
                                    boxShadow: `0 0 40px ${currentStep.color}15, 0 15px 30px rgba(0,0,0,0.2)`,
                                }}
                            >
                                {/* Step Number Badge */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-6"
                                    style={{
                                        backgroundColor: `${currentStep.color}20`,
                                        color: currentStep.color,
                                    }}
                                >
                                    Step {currentStep.step}
                                </motion.div>

                                {/* Icon with Glow */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${currentStep.color}30, ${currentStep.color}10)`,
                                        boxShadow: `0 0 20px ${currentStep.color}25`,
                                        color: currentStep.color,
                                    }}
                                >
                                    {currentStep.icon}
                                </motion.div>

                                {/* Title */}
                                <motion.h3
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-xl font-bold text-white mb-2"
                                >
                                    {currentStep.title}
                                </motion.h3>

                                {/* Description */}
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-gray-400 leading-relaxed"
                                >
                                    {currentStep.desc}
                                </motion.p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-3 mt-6">
                {steps.map((step, index) => (
                    <button
                        key={index}
                        onClick={() => goToStep(index)}
                        className="group relative"
                        aria-label={`Go to step ${index + 1}`}
                    >
                        <motion.div
                            animate={{
                                scale: index === activeIndex ? 1 : 0.8,
                                opacity: index === activeIndex ? 1 : 0.5,
                            }}
                            className="transition-all duration-300"
                        >
                            <div
                                className={`
                                    w-3 h-3 rounded-full transition-all duration-300
                                    ${index === activeIndex
                                        ? 'w-10 shadow-lg'
                                        : 'group-hover:opacity-80'
                                    }
                                `}
                                style={{
                                    backgroundColor: index === activeIndex ? step.color : 'rgba(255,255,255,0.2)',
                                    boxShadow: index === activeIndex ? `0 0 15px ${step.color}50` : 'none',
                                }}
                            />
                        </motion.div>
                    </button>
                ))}
            </div>

            {/* Step Counter */}
            <div className="text-center mt-6">
                <span className="text-sm text-gray-500">
                    {activeIndex + 1} of {steps.length}
                </span>
                {isAutoPlaying && (
                    <span className="text-xs text-[#FF8C00] ml-3">● Auto-playing</span>
                )}
            </div>
        </div>
    );
}
