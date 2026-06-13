import React from 'react';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <h1 className="text-4xl font-bold mb-8 text-[#FF8C00]">Privacy Policy</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">Last updated: January 27, 2026</p>
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Data Collection</h2>
                    <p>We collect your SteamID, username, and avatar to provide our services.</p>
                </section>
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Cookies</h2>
                    <p>We use cookies to maintain your login session.</p>
                </section>
                <p className="italic">This is a placeholder page. Detailed privacy policy will be provided soon.</p>
            </div>
        </div>
    );
}
