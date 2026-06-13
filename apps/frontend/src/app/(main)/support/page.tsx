import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export default function SupportPage() {
    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <h1 className="text-4xl font-bold mb-8 text-[#FF8C00]">Support Center</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#0D0D12]/50 border border-[#FF8C00]/10 p-8 rounded-2xl">
                    <Mail className="w-12 h-12 text-[#FF8C00] mb-6" />
                    <h2 className="text-2xl font-bold mb-4">Email Support</h2>
                    <p className="text-muted-foreground mb-6">Contact our team directly for business inquiries or complex issues.</p>
                    <a href="mailto:support@sgomarket.com" className="text-[#FF8C00] font-bold hover:underline">support@sgomarket.com</a>
                </div>
                <div className="bg-[#0D0D12]/50 border border-[#FF8C00]/10 p-8 rounded-2xl">
                    <MessageSquare className="w-12 h-12 text-[#FF8C00] mb-6" />
                    <h2 className="text-2xl font-bold mb-4">Telegram Bot</h2>
                    <p className="text-muted-foreground mb-6">Use our automated Telegram bot for 24/7 trade assistance and alerts.</p>
                    <a href="https://t.me/SGOMarketBot" className="text-[#FF8C00] font-bold hover:underline">@SGOMarketBot</a>
                </div>
            </div>
        </div>
    );
}
