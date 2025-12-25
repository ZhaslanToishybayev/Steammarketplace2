import Link from 'next/link';
import { Button } from '../components/ui';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HomeCTA } from '../components/home/HomeCTA';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 relative text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Trade CS2 Skins with
            <span className="text-primary block mt-2">Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            The most trusted marketplace for CS2 items. Buy, sell, and trade with real-time prices,
            instant cashout, and secure escrow protection.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button size="lg" className="h-12 px-8 text-lg shadow-lg shadow-primary/20">
                Browse Marketplace
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-lg">
                Start Selling
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-24">
            {[
              { label: 'Total Volume', value: '$2.5M+' },
              { label: 'Active Listings', value: '15,000+' },
              { label: 'Happy Users', value: '50,000+' },
              { label: 'Avg. Response', value: '< 30s' },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border bg-muted/50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose Us?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🔒',
                title: 'Secure Escrow',
                description: 'Your items and money are protected until the trade is complete. No scams, no worries.',
              },
              {
                icon: '⚡',
                title: 'Instant Cashout',
                description: 'Sell your skins instantly at competitive prices. Get paid to your balance immediately.',
              },
              {
                icon: '📊',
                title: 'Real-Time Prices',
                description: 'Prices updated from Steam Market, Buff163, and other sources for accurate valuations.',
              },
              {
                icon: '🎯',
                title: 'Smart Valuation',
                description: 'We factor in stickers, float values, and patterns for the best possible prices.',
              },
              {
                icon: '🤖',
                title: 'Automated Trading',
                description: 'Our bots handle trades 24/7. Fast, reliable, and always online.',
              },
              {
                icon: '💎',
                title: 'Low Fees',
                description: 'Just 5% fee on sales. Keep more of what you earn.',
              },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors shadow-sm">
                <div className="text-4xl mb-6 bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">
            Join thousands of traders and start buying or selling CS2 skins today.
          </p>
          <HomeCTA />
        </div>
      </section>

      <Footer />
    </div>
  );
}
