import Link from 'next/link';

export function Footer() {
    return (
        <footer className="py-12 border-t border-border bg-background mt-auto">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-muted-foreground">
                        © 2025 SteamMarket. Secure Skin Trading Platform.
                    </div>
                    <div className="flex gap-8 text-sm font-medium">
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            Terms
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            Privacy
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
