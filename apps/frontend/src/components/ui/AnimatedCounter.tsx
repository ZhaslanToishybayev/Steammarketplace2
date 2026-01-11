'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    target: string;
    duration?: number;
    className?: string;
}

function parseTarget(target: string): { value: number; prefix: string; suffix: string } {
    // Parse strings like "$2.5M+", "15,000+", "50,000+", "<30s"
    const prefix = target.match(/^[^0-9.]*/)?.[0] || '';
    const suffix = target.match(/[^0-9.]*$/)?.[0] || '';
    const numStr = target.replace(/[^0-9.]/g, '');
    const value = parseFloat(numStr) || 0;

    return { value, prefix, suffix };
}

function formatValue(value: number, target: string): string {
    const { prefix, suffix } = parseTarget(target);

    // Determine format based on original target
    if (target.includes('M')) {
        return `${prefix}${value.toFixed(1)}M${suffix.replace('M', '')}`;
    }
    if (target.includes(',') || value >= 1000) {
        return `${prefix}${Math.round(value).toLocaleString()}${suffix}`;
    }
    if (target.includes('.')) {
        return `${prefix}${value.toFixed(1)}${suffix}`;
    }
    return `${prefix}${Math.round(value)}${suffix}`;
}

export function AnimatedCounter({ target, duration = 2000, className = '' }: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState('0');
    const [hasAnimated, setHasAnimated] = useState(false);
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true);
                        animateValue();
                    }
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [hasAnimated, target, duration]);

    const animateValue = () => {
        const { value: targetValue, prefix, suffix } = parseTarget(target);
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out-cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentValue = targetValue * easeOut;
            setDisplayValue(formatValue(currentValue, target));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(target); // Ensure exact final value
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <span ref={elementRef} className={className}>
            {displayValue}
        </span>
    );
}
