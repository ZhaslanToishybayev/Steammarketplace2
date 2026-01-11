'use client';

import React from 'react';

interface FloatBarProps {
    value: number; // 0.00 to 1.00
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function FloatBar({ value, showValue = true, size = 'md' }: FloatBarProps) {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value));
    const percentage = clampedValue * 100;

    const heights = {
        sm: 'h-1',
        md: 'h-1.5',
        lg: 'h-2',
    };

    const indicatorHeights = {
        sm: 'h-2.5',
        md: 'h-3',
        lg: 'h-4',
    };

    // Get condition label
    const getCondition = (float: number): string => {
        if (float < 0.07) return 'FN';
        if (float < 0.15) return 'MW';
        if (float < 0.38) return 'FT';
        if (float < 0.45) return 'WW';
        return 'BS';
    };

    // Get condition full name
    const getConditionFull = (float: number): string => {
        if (float < 0.07) return 'Factory New';
        if (float < 0.15) return 'Minimal Wear';
        if (float < 0.38) return 'Field-Tested';
        if (float < 0.45) return 'Well-Worn';
        return 'Battle-Scarred';
    };

    // Get color based on float value
    const getColor = (float: number): string => {
        if (float < 0.07) return '#22c55e'; // Green - FN
        if (float < 0.15) return '#84cc16'; // Lime - MW
        if (float < 0.38) return '#eab308'; // Yellow - FT
        if (float < 0.45) return '#f97316'; // Orange - WW
        return '#ef4444'; // Red - BS
    };

    return (
        <div className="w-full">
            {showValue && (
                <div className="flex justify-between items-center mb-1">
                    <span
                        className="text-xs font-bold"
                        style={{ color: getColor(clampedValue) }}
                    >
                        {getCondition(clampedValue)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {clampedValue.toFixed(4)}
                    </span>
                </div>
            )}
            <div className="relative">
                <div className={`float-bar w-full ${heights[size]}`} />
                <div
                    className={`absolute top-1/2 -translate-y-1/2 w-0.5 ${indicatorHeights[size]} bg-white rounded-full shadow-lg`}
                    style={{
                        left: `${percentage}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `0 0 6px ${getColor(clampedValue)}`,
                    }}
                />
            </div>
        </div>
    );
}

// Simple Float Display (inline)
interface FloatDisplayProps {
    value: number;
    showCondition?: boolean;
}

export function FloatDisplay({ value, showCondition = true }: FloatDisplayProps) {
    const getCondition = (float: number): string => {
        if (float < 0.07) return 'FN';
        if (float < 0.15) return 'MW';
        if (float < 0.38) return 'FT';
        if (float < 0.45) return 'WW';
        return 'BS';
    };

    const getColor = (float: number): string => {
        if (float < 0.07) return '#22c55e';
        if (float < 0.15) return '#84cc16';
        if (float < 0.38) return '#eab308';
        if (float < 0.45) return '#f97316';
        return '#ef4444';
    };

    return (
        <span
            className="inline-flex items-center gap-1 text-xs font-mono"
            style={{ color: getColor(value) }}
        >
            {showCondition && (
                <span className="font-bold">{getCondition(value)}</span>
            )}
            <span>{value.toFixed(4)}</span>
        </span>
    );
}
