import React from 'react';

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <h1 className="text-4xl font-bold mb-8 text-[#FF8C00]">Terms of Service</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">Last updated: January 27, 2026</p>
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Introduction</h2>
                    <p>Welcome to SGO Market. By using our service, you agree to these terms.</p>
                </section>
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. P2P Trading</h2>
                    <p>Our platform facilitates Peer-to-Peer trading of virtual items. We are not responsible for Steam trade bans resulting from improper usage.</p>
                </section>
                <p className="italic">This is a placeholder page. Detailed terms will be provided soon.</p>
            </div>
        </div>
    );
}
