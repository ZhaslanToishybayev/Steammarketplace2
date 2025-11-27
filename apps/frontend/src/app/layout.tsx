import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { QueryProvider } from '../providers/query-provider';
import { SocketProvider } from '../providers/SocketProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Steam Marketplace - Buy, Sell, and Trade Steam Items',
    template: '%s | Steam Marketplace',
  },
  description: 'The ultimate marketplace for Steam items. Buy, sell, and trade with confidence.',
  keywords: ['Steam', 'marketplace', 'trading', 'gaming', 'items'],
  authors: [{ name: 'Steam Marketplace Team' }],
  creator: 'Steam Marketplace',
  publisher: 'Steam Marketplace',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Steam Marketplace - Buy, Sell, and Trade Steam Items',
    description: 'The ultimate marketplace for Steam items. Buy, sell, and trade with confidence.',
    siteName: 'Steam Marketplace',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Steam Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Steam Marketplace - Buy, Sell, and Trade Steam Items',
    description: 'The ultimate marketplace for Steam items. Buy, sell, and trade with confidence.',
    images: ['/images/twitter-image.png'],
    creator: '@steam_marketplace',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-text-primary min-h-screen`}>
        <QueryProvider>
          <SocketProvider>
            <ToastProvider>
              <ErrorBoundary>
                <div className="relative flex min-h-screen flex-col">
                  <div className="flex-1">{children}</div>
                </div>
              </ErrorBoundary>
            </ToastProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}