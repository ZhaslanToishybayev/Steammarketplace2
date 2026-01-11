import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

// SEO Meta Tags
export const metadata: Metadata = {
  title: {
    default: "Steam Marketplace - Buy & Sell CS2 Skins Safely",
    template: "%s | Steam Marketplace"
  },
  description: "The most secure platform to buy and sell CS2, Dota 2, and Steam items. Instant trades, escrow protection, and competitive prices. Trade with confidence!",
  keywords: [
    "CS2 skins", "CS:GO marketplace", "Steam trading", "buy CS2 skins",
    "sell CS2 skins", "Dota 2 items", "Steam items", "escrow trading",
    "skin marketplace", "CS2 trading", "safe trading"
  ],
  authors: [{ name: "Steam Marketplace" }],
  creator: "Steam Marketplace",
  publisher: "Steam Marketplace",

  // Open Graph (Facebook, Discord, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yourdomain.com",
    siteName: "Steam Marketplace",
    title: "Steam Marketplace - Buy & Sell CS2 Skins Safely",
    description: "The most secure platform to buy and sell CS2 and Dota 2 items with escrow protection.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Steam Marketplace - Secure Skin Trading"
      }
    ]
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Steam Marketplace - Buy & Sell CS2 Skins Safely",
    description: "Trade CS2, Dota 2, and Steam items with escrow protection.",
    images: ["/og-image.png"],
    creator: "@steammarketplace"
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },

  // Verification (add your codes)
  verification: {
    google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  // Manifest
  manifest: "/site.webmanifest",

  // Alternate languages (if needed)
  alternates: {
    canonical: "https://yourdomain.com",
    languages: {
      "en-US": "https://yourdomain.com",
      "ru-RU": "https://yourdomain.com/ru",
    }
  }
};

// Viewport settings
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://steamcommunity.com" />
        <link rel="preconnect" href="https://community.cloudflare.steamstatic.com" />
        <link rel="dns-prefetch" href="https://steamcommunity.com" />
        {/* Steam Login Fix */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener("DOMContentLoaded", function() {
                // Fix header button
                const headerButton = document.querySelector("header button");
                if (headerButton) {
                  headerButton.style.cursor = "pointer";
                  headerButton.addEventListener("click", function() {
                    window.location.href = "/api/auth/steam";
                  });
                }

                // Fix main page button
                const mainButtons = document.querySelectorAll("button");
                mainButtons.forEach(function(btn) {
                  if (btn.textContent && btn.textContent.includes("Login with Steam")) {
                    btn.style.cursor = "pointer";
                    btn.addEventListener("click", function() {
                      window.location.href = "/api/auth/steam";
                    });
                  }
                });
              });
            `
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[hsl(var(--background))] text-[hsl(var(--foreground))] min-h-screen selection:bg-blue-500/30`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

