'use client';

import { motion } from 'framer-motion';
import { AnimatedCounter } from '../ui/AnimatedCounter';

const stats = [
    { label: 'Total Volume', value: '$2.5M+' },
    { label: 'Active Listings', value: '15,000+' },
    { label: 'Happy Users', value: '50,000+' },
    { label: 'Avg. Response', value: '<30s' },
];

export function StatsSection() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-20">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="group p-6 rounded-2xl glass-steam transition-all duration-300 hover:border-[#FF8C00]/30 cursor-default"
                >
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-2 group-hover:text-[#FF8C00] transition-colors">
                        <AnimatedCounter target={stat.value} duration={2000} />
                    </div>
                    <div className="text-muted-foreground font-medium">
                        {stat.label}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
