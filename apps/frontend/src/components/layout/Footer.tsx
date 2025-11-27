'use client';

import {
  DiscordLogoIcon,
  TwitterLogoIcon,
  EnvelopeClosedIcon,
  GlobeIcon,
} from '@radix-ui/react-icons';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: 'Marketplace',
      links: [
        { name: 'Browse Items', href: '/market' },
        { name: 'My Inventory', href: '/inventory' },
        { name: 'Trade Offers', href: '/trade' },
        { name: 'Price Guide', href: '/prices' },
      ],
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Steam Support', href: 'https://help.steampowered.com' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Blog', href: '/blog' },
        { name: 'News', href: '/news' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Refund Policy', href: '/refunds' },
      ],
    },
  ];

  const socialLinks = [
    {
      name: 'Discord',
      href: 'https://discord.gg/example',
      icon: DiscordLogoIcon,
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/example',
      icon: TwitterLogoIcon,
    },
    {
      name: 'Steam Community',
      href: 'https://steamcommunity.com/groups/example',
      icon: GlobeIcon,
    },
  ];

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">
              Steam<span className="text-orange-500">Market</span>
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              The premier marketplace for Steam items, skins, and trading cards.
              Buy, sell, and trade with confidence using our secure platform.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">{social.name}</span>
                  <social.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Columns */}
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-8 border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row md:justify-between items-center">
            {/* Newsletter */}
            <div className="mb-4 md:mb-0">
              <h4 className="text-sm font-semibold text-white mb-2">
                Stay Updated
              </h4>
              <p className="text-gray-400 text-sm mb-2">
                Subscribe to our newsletter for the latest updates and exclusive offers.
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="px-3 py-2 text-gray-900 rounded-l-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
                />
                <button className="bg-orange-500 text-white px-4 py-2 rounded-r-md hover:bg-orange-600 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="flex space-x-2">
              <div className="flex space-x-1">
                <div className="w-8 h-5 bg-gray-700 rounded"></div>
                <div className="w-8 h-5 bg-gray-700 rounded"></div>
                <div className="w-8 h-5 bg-gray-700 rounded"></div>
                <div className="w-8 h-5 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-gray-800 pt-4">
          <div className="flex flex-col md:flex-row md:justify-between items-center text-sm text-gray-400">
            <div>
              <span>© {currentYear} SteamMarket. All rights reserved.</span>
            </div>
            <div className="flex space-x-4 mt-2 md:mt-0">
              <a href="/terms" className="hover:text-orange-500 transition-colors">
                Terms
              </a>
              <a href="/privacy" className="hover:text-orange-500 transition-colors">
                Privacy
              </a>
              <a href="/cookies" className="hover:text-orange-500 transition-colors">
                Cookies
              </a>
              <a href="/sitemap" className="hover:text-orange-500 transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}