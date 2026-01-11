/*
 * Steam Marketplace Cloudflare Worker
 * Optimizes Steam API requests and serves cached content from edge
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Steam API optimization
  if (url.pathname.startsWith('/api/steam-optimized/')) {
    return handleSteamApi(request, url)
  }

  // Static asset optimization
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|avif)$/)) {
    return handleStaticAsset(request)
  }

  // API caching
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request)
  }

  // Default pass-through
  return fetch(request)
}

async function handleSteamApi(request, url) {
  const cacheUrl = new URL(request.url)
  const cacheKey = new Request(cacheUrl.toString(), request)
  const cache = caches.default

  // Try to get from cache
  let response = await cache.match(cacheKey)

  if (!response) {
    console.log('Cache miss for:', cacheKey.url)

    // Fetch from origin
    response = await fetch(cacheKey)

    // Only cache successful responses
    if (response.status === 200) {
      // Clone response for caching
      const responseClone = response.clone()

      // Set cache TTL based on endpoint
      let ttl = 300 // 5 minutes default
      if (url.pathname.includes('/prices')) ttl = 1800 // 30 minutes
      if (url.pathname.includes('/inventory')) ttl = 600 // 10 minutes
      if (url.pathname.includes('/player')) ttl = 3600 // 1 hour

      // Add cache headers
      const headers = new Headers(responseClone.headers)
      headers.set('Cache-Control', `public, max-age=${ttl}`)
      headers.set('X-Cache', 'MISS')

      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers
      })

      // Cache the response
      event.waitUntil(cache.put(cacheKey, modifiedResponse.clone()))

      return modifiedResponse
    }
  } else {
    console.log('Cache hit for:', cacheKey.url)
    // Add cache hit header
    const headers = new Headers(response.headers)
    headers.set('X-Cache', 'HIT')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  return response
}

async function handleStaticAsset(request) {
  const cacheUrl = new URL(request.url)
  const cacheKey = new Request(cacheUrl.toString(), request)
  const cache = caches.default

  // Try to get from cache
  let response = await cache.match(cacheKey)

  if (!response) {
    console.log('Cache miss for static asset:', cacheKey.url)

    // Fetch from origin
    response = await fetch(cacheKey)

    // Only cache successful responses for 1 month
    if (response.status === 200) {
      const responseClone = response.clone()

      // Set long cache headers
      const headers = new Headers(responseClone.headers)
      headers.set('Cache-Control', 'public, max-age=2592000, immutable')
      headers.set('X-Cache', 'MISS')

      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers
      })

      // Cache the response
      event.waitUntil(cache.put(cacheKey, modifiedResponse.clone()))

      return modifiedResponse
    }
  } else {
    console.log('Cache hit for static asset:', cacheKey.url)
    const headers = new Headers(response.headers)
    headers.set('X-Cache', 'HIT')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  return response
}

async function handleApiRequest(request) {
  const cacheUrl = new URL(request.url)
  const cacheKey = new Request(cacheUrl.toString(), request)
  const cache = caches.default

  // Try to get from cache
  let response = await cache.match(cacheKey)

  if (!response) {
    console.log('Cache miss for API:', cacheKey.url)

    // Fetch from origin
    response = await fetch(cacheKey)

    // Cache successful GET requests for 5 minutes
    if (response.status === 200 && request.method === 'GET') {
      const responseClone = response.clone()

      // Set cache headers
      const headers = new Headers(responseClone.headers)
      headers.set('Cache-Control', 'public, max-age=300')
      headers.set('X-Cache', 'MISS')

      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers
      })

      // Cache the response
      event.waitUntil(cache.put(cacheKey, modifiedResponse.clone()))

      return modifiedResponse
    }
  } else {
    console.log('Cache hit for API:', cacheKey.url)
    const headers = new Headers(response.headers)
    headers.set('X-Cache', 'HIT')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  return response
}

// Bot detection and blocking
function isBot(request) {
  const userAgent = request.headers.get('User-Agent') || ''
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /requests/i
  ]

  return botPatterns.some(pattern => pattern.test(userAgent))
}

// Rate limiting
async function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP')
  const key = `rate_limit_${ip}`

  // Simple rate limiting logic
  // In production, use KV or D1 for persistent storage
  return true
}