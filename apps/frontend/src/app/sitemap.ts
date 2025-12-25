import { MetadataRoute } from 'next';

// Dynamic Sitemap Generator
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
    const currentDate = new Date().toISOString();

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/marketplace`,
            lastModified: currentDate,
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/sell`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
    ];

    // In production, you'd fetch item URLs from database:
    // const items = await db.query('SELECT market_hash_name, updated_at FROM listings WHERE status = $1 LIMIT 1000', ['active']);
    // const itemPages = items.rows.map(item => ({
    //     url: `${baseUrl}/item/${encodeURIComponent(item.market_hash_name)}`,
    //     lastModified: item.updated_at,
    //     changeFrequency: 'daily' as const,
    //     priority: 0.8,
    // }));

    // Sample item pages (replace with dynamic in production)
    const sampleItems = [
        'AK-47 | Redline (Field-Tested)',
        'AWP | Asiimov (Field-Tested)',
        'M4A4 | Howl (Factory New)',
        'Butterfly Knife | Fade (Factory New)',
        'Karambit | Doppler (Factory New)',
    ];

    const itemPages: MetadataRoute.Sitemap = sampleItems.map(item => ({
        url: `${baseUrl}/item/${encodeURIComponent(item)}`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    return [...staticPages, ...itemPages];
}
