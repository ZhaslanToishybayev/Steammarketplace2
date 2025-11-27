import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://steammarket.com';

  return {
    rule: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/admin/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/auth/', '/admin/', '/api/', '/users/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}