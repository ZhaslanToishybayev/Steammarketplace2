import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            <Navbar />

            {/* Main Content */}
            <main className="pt-24 flex-grow">
                {children}
            </main>

            <Footer />
        </div>
    );
}
