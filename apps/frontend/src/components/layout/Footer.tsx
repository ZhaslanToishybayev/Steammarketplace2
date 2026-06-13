import Link from 'next/link';

export function Footer() {
    return (
        <footer className="py-12 border-t border-[#FF8C00]/10 bg-[var(--bg-primary)] mt-auto">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF8C00] to-[#E67E00] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <span className="text-gray-400">
                            © 2025 <span className="text-white font-medium">SGO<span className="text-[#FF8C00]">Market</span></span>
                        </span>
                    </div>

                    {/* Links */}
                    <div className="flex gap-8 text-sm font-medium">
                        <Link href="/terms" className="text-gray-500 hover:text-[#FF8C00] transition-colors">
                            Terms
                        </Link>
                        <Link href="/privacy" className="text-gray-500 hover:text-[#FF8C00] transition-colors">
                            Privacy
                        </Link>
                        <Link href="/support" className="text-gray-500 hover:text-[#FF8C00] transition-colors">
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
