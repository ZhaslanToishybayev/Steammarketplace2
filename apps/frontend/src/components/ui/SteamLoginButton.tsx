'use client';

import { Button } from '../ui';
import { motion } from 'framer-motion';

interface SteamLoginButtonProps {
    onClick: () => void;
    size?: 'sm' | 'default' | 'lg';
    fullWidth?: boolean;
    className?: string;
}

export function SteamLoginButton({ onClick, size = 'lg', fullWidth = false, className = '' }: SteamLoginButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(255, 140, 0, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            className={`
                inline-flex items-center justify-center gap-2 
                rounded-xl text-lg font-bold
                bg-gradient-to-r from-[#FF8C00] to-[#E67E00] 
                hover:from-[#FFA500] hover:to-[#FF8C00] 
                text-white
                shadow-lg shadow-[#FF8C00]/40
                hover:shadow-xl hover:shadow-[#FF8C00]/50
                transition-all duration-300
                px-8 py-4
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
        >
            {/* Steam Logo */}
            <svg
                className="w-6 h-6"
                viewBox="0 0 256 259"
                fill="currentColor"
            >
                <path d="M127.779 0C60.42 0 5.24 52.412 0 119.012l68.724 28.674c5.822-3.997 12.856-6.34 20.439-6.34 1.322 0 2.627.065 3.907.196l30.601-44.67v-.626c0-27.593 22.283-50.048 49.664-50.048 27.38 0 49.67 22.455 49.67 50.048 0 27.593-22.29 50.048-49.67 50.048-.786 0-1.565-.02-2.338-.057l-43.842 31.527c.063 1.035.102 2.08.102 3.133 0 20.743-16.735 37.607-37.324 37.607-18.066 0-33.14-12.867-36.655-30.013L3.59 166.096c20.22 53.802 72.04 92.14 132.94 92.14 78.85 0 142.792-64.522 142.792-144.11C279.322 51.493 206.629 0 127.779 0" fill="#ffffff" />
                <path d="M81.281 196.127l-15.592-6.508c2.77 5.785 7.356 10.628 13.322 13.397 12.938 6.008 28.28.469 34.228-12.365a26.253 26.253 0 0 0 1.986-10.07 26.192 26.192 0 0 0-1.986-10.055c-5.948-12.833-21.29-18.372-34.228-12.365a25.866 25.866 0 0 0-10.048 8.023l16.092 6.714c9.543 3.975 14.055 14.937 10.07 24.456-3.985 9.519-14.896 14.017-24.439 10.042l10.595-11.269Z" fill="#FF8C00" />
                <path d="M173.336 96.246c0-18.395-14.839-33.347-33.104-33.347-18.266 0-33.105 14.952-33.105 33.347 0 18.395 14.839 33.347 33.105 33.347 18.265 0 33.104-14.952 33.104-33.347Zm-54.859 0c0-12.144 9.73-22.002 21.755-22.002 12.024 0 21.755 9.858 21.755 22.002 0 12.144-9.73 22.002-21.755 22.002-12.025 0-21.755-9.858-21.755-22.002Z" fill="#FF8C00" />
            </svg>

            <span>Login with Steam</span>

            {/* Animated arrow */}
            <motion.svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </motion.svg>
        </motion.button>
    );
}
