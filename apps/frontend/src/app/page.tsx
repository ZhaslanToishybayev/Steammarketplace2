'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HomeCTA } from '../components/home/HomeCTA';
import { StepsCarousel } from '../components/home/StepsCarousel';
import { Shield, Zap, BarChart3, Target, Bot, Wallet, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';

// --- Modern Components ---

// 1. Magnetic Button
const MagneticButton = ({ children, className, variant = 'primary', ...props }: any) => {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current!.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        x.set(middleX * 0.15);
        y.set(middleY * 0.15);
    };

    const reset = () => {
        x.set(0);
        y.set(0);
    };

    const baseStyles = "relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-2 overflow-hidden group";
    const variants = {
        primary: "bg-gradient-to-r from-[#FF8C00] to-[#E67E00] text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40",
        outline: "border border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-md"
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={reset}
            style={{ x, y }}
            className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${className}`}
            whileTap={{ scale: 0.95 }}
            {...props}
        >
            <span className="relative z-10 flex items-center gap-2">{children}</span>
            {/* Hover Glare */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
        </motion.button>
    );
};

// 2. Holographic Card
const HolographicCard = ({ icon: Icon, title, description, delay }: any) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay * 0.1 }}
            onMouseMove={handleMouseMove}
            className="group relative border border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl p-8 overflow-hidden hover:border-[#FF8C00]/30 transition-colors duration-500"
        >
            {/* Mouse Spotlight */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 140, 0, 0.15),
              transparent 80%
            )
          `,
                }}
            />
            
            <div className="relative z-10">
                <div className="w-14 h-14 mb-6 rounded-2xl bg-gradient-to-br from-[#FF8C00]/10 to-[#E67E00]/5 flex items-center justify-center border border-[#FF8C00]/10 group-hover:scale-110 group-hover:border-[#FF8C00]/30 transition-all duration-300">
                    <Icon className="w-7 h-7 text-[#FF8C00] group-hover:drop-shadow-[0_0_8px_rgba(255,140,0,0.5)] transition-all" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
};

// 3. Stats Counter
const StatItem = ({ value, label, prefix = '', suffix = '' }: any) => {
    return (
        <div className="text-center">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-2"
            >
                {prefix}{value}{suffix}
            </motion.div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">{label}</p>
        </div>
    );
};

const features = [
    { icon: Shield, title: 'Secure Escrow', description: 'Every trade is protected by our automated bot system. Zero risk of scam.' },
    { icon: Zap, title: 'Instant Cashout', description: 'Sell your skins and get paid to your wallet in seconds. No waiting.' },
    { icon: BarChart3, title: 'Live Market', description: 'Real-time price updates from Steam Community Market and Buff163.' },
    { icon: Target, title: 'Smart Valuation', description: 'We recognize stickers, floats, and rare patterns for accurate pricing.' },
    { icon: Bot, title: '24/7 Automation', description: 'Our fleet of trade bots works around the clock to deliver your items.' },
    { icon: Wallet, title: 'Low 5% Fees', description: 'Keep more of your profit with the lowest fees in the industry.' },
];

export default function HomePage() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);

    return (
        <div className="min-h-screen bg-[#050507] selection:bg-[#FF8C00]/30 overflow-x-hidden font-sans">
            <Navbar />

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    {/* Restored Hero Background Image */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/hero-bg.png"
                            alt=""
                            fill
                            className="object-cover opacity-40 mix-blend-overlay"
                            priority
                        />
                        {/* Gradient Overlay for Fade */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/90 via-[#050507]/50 to-[#050507]" />
                    </div>

                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1005]/50 via-[#050507]/80 to-[#050507]" />
                    <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#FF8C00]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
                    <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#E67E00]/5 rounded-full blur-[100px] mix-blend-screen" />
                    
                    {/* Grid */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
                        
                        {/* Trust Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-gray-300">Trusted by <span className="text-white font-bold">50,000+</span> traders</span>
                        </motion.div>

                        {/* Main Title */}
                        <motion.h1
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-6xl md:text-8xl font-black text-white leading-[1.1] tracking-tight mb-8"
                        >
                            Trade Skins. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C00] via-[#FFD700] to-[#FF8C00] animate-text-shimmer bg-[length:200%_auto]">
                                Instantly.
                            </span>
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed"
                        >
                            The most advanced P2P marketplace for CS2 skins. 
                            Secure escrow, instant withdrawals, and fair pricing powered by AI.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 w-full justify-center"
                        >
                            <Link href="/marketplace">
                                <MagneticButton className="w-full sm:w-auto px-12">
                                    Browse Market <ArrowRight className="w-5 h-5" />
                                </MagneticButton>
                            </Link>
                            <Link href="/sell">
                                <MagneticButton variant="outline" className="w-full sm:w-auto">
                                    Start Selling
                                </MagneticButton>
                            </Link>
                        </motion.div>

                        {/* Floating Glass Stats (Island) */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="mt-20 w-full max-w-4xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <StatItem value="1.2M" suffix="+" label="Total Volume" prefix="$" />
                                <StatItem value="450" suffix="K" label="Skins Traded" />
                                <StatItem value="0.1" suffix="s" label="Avg Speed" />
                                <StatItem value="5.0" suffix="%" label="Low Fee" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES GRID --- */}
            <section className="py-32 relative z-10">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Why SGO Market?</h2>
                        <p className="text-gray-400 text-lg">Built for traders, by traders.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <HolographicCard key={i} {...f} delay={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS (Carousel) --- */}
            <section className="py-32 border-t border-white/5 bg-[#08080A]">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-gray-400">Start trading in minutes</p>
                    </div>
                    <StepsCarousel />
                </div>
            </section>

            {/* --- CTA BOTTOM --- */}
            <section className="py-32 relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#FF8C00] to-[#E67E00] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20" />
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Ready to upgrade your inventory?</h2>
                            <p className="text-white/90 text-xl mb-10 max-w-2xl mx-auto">Join the fastest growing CS2 marketplace today.</p>
                            <Link href="/auth/steam">
                                <button className="bg-white text-[#E67E00] px-12 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl">
                                    Login with Steam
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
