'use client';

import React, { useState } from 'react';

export const StagingBanner: React.FC = () => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div className="bg-yellow-600/90 text-white px-4 py-2 text-sm font-medium text-center relative z-[60]">
            <p>
                🚧 <strong>STAGING ENVIRONMENT</strong>: System is in Beta. Used for testing only.
                All money and items are <strong>VIRTUAL</strong>. Real payments are disabled.
            </p>
            <button
                onClick={() => setVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded"
                aria-label="Dismiss staging warning"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6ly12 12" />
                </svg>
            </button>
        </div>
    );
};
