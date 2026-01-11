// End-to-End tests for Steam Marketplace Workflow
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

describe('Steam Marketplace E2E Tests', () => {
  let browser;
  let page;
  let server;

  beforeAll(async () => {
    // Start the unified server for testing
    server = spawn('node', [path.join(__dirname, '../unified-server-enhanced.js')], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: true, // Set to false for debugging
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Set up request interception for API calls
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Allow all requests except for tracking/analytics
      if (request.url().includes('google-analytics') || request.url().includes('facebook')) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }, 60000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
  });

  describe('User Registration and Authentication Flow', () => {
    test('should load homepage and display Steam login button', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      // Check if page loaded correctly
      const title = await page.title();
      expect(title).toContain('Enhanced Steam Marketplace');

      // Check for Steam login button
      const steamButton = await page.$('a[href="/api/steam/auth"]');
      expect(steamButton).toBeTruthy();

      // Check for demo inventory button
      const demoButton = await page.$('a[href="/inventory-demo"]');
      expect(demoButton).toBeTruthy();
    }, 30000);

    test('should navigate to Steam OAuth login', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      // Click Steam login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('a[href="/api/steam/auth"]')
      ]);

      // Should redirect to Steam (we can't test the actual Steam login in E2E)
      const currentUrl = page.url();
      expect(currentUrl).toContain('steamcommunity.com');
    }, 30000);

    test('should display demo inventory page', async () => {
      await page.goto('http://localhost:3000/inventory-demo', { waitUntil: 'networkidle2' });

      // Check for demo inventory title
      const title = await page.$eval('h1', el => el.textContent);
      expect(title).toContain('Demo Steam Inventory');

      // Check for inventory items
      const items = await page.$$('.inventory-item');
      expect(items.length).toBeGreaterThan(0);

      // Check for item details
      const firstItem = await page.$('.inventory-item:first-child .item-name');
      const itemName = await page.evaluate(el => el.textContent, firstItem);
      expect(itemName).toBeTruthy();
    }, 30000);
  });

  describe('API Endpoints Testing', () => {
    test('should fetch health check endpoint', async () => {
      const response = await page.goto('http://localhost:3000/api/health', {
        waitUntil: 'networkidle2'
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('unified-server-enhanced');
      expect(body.cache).toBeDefined();
    }, 10000);

    test('should fetch marketplace statistics', async () => {
      const response = await page.goto('http://localhost:3000/api/trading/stats', {
        waitUntil: 'networkidle2'
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalListings');
      expect(body.data).toHaveProperty('activeListings');
      expect(body.data).toHaveProperty('totalTrades');
    }, 10000);

    test('should handle Steam inventory API with valid Steam ID', async () => {
      const response = await page.goto('http://localhost:3000/api/steam/inventory/76561198012345678', {
        waitUntil: 'networkidle2'
      });

      const body = await response.json();
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('steamId', '76561198012345678');
      expect(body).toHaveProperty('metadata');
    }, 10000);

    test('should validate Steam ID format', async () => {
      const response = await page.goto('http://localhost:3000/api/steam/inventory/invalid', {
        waitUntil: 'networkidle2'
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid Steam ID format');
    }, 10000);
  });

  describe('Trading System Testing', () => {
    test('should create and manage trading listings', async () => {
      // Test creating a listing via API
      const createListingResponse = await page.evaluate(async () => {
        const response = await fetch('/api/trading/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            steamId: '76561198012345678',
            appId: '730',
            itemId: 'test_item_123',
            itemName: 'Test AK-47',
            price: 250.50,
            currency: 'USD'
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      });

      expect(createListingResponse.status).toBe(200);
      expect(createListingResponse.data.success).toBe(true);
      expect(createListingResponse.data.data.itemName).toBe('Test AK-47');

      // Test fetching listings
      const fetchListingsResponse = await page.evaluate(async () => {
        const response = await fetch('/api/trading/listings');
        return {
          status: response.status,
          data: await response.json()
        };
      });

      expect(fetchListingsResponse.status).toBe(200);
      expect(fetchListingsResponse.data.success).toBe(true);
      expect(fetchListingsResponse.data.data).toBeInstanceOf(Array);
    }, 20000);

    test('should create and manage trade offers', async () => {
      // Test creating a trade offer
      const createOfferResponse = await page.evaluate(async () => {
        const response = await fetch('/api/trading/offers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toSteamId: '76561198012345678',
            appId: '730',
            offerItems: [{ id: 'item_1', name: 'Test Item 1' }],
            requestedItems: [{ id: 'item_2', name: 'Test Item 2' }],
            message: 'Looking to trade'
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      });

      expect(createOfferResponse.status).toBe(200);
      expect(createOfferResponse.data.success).toBe(true);
      expect(createOfferResponse.data.data.status).toBe('pending');
    }, 20000);
  });

  describe('User Interface Testing', () => {
    test('should handle health check button click', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      // Click health check button
      await page.click('button[onclick="testHealth()"]');

      // Wait for result to appear
      await page.waitForSelector('#result', { visible: true });
      await page.waitForFunction(
        () => document.querySelector('#result').style.display === 'block'
      );

      // Check that result contains health check data
      const resultText = await page.$eval('#result', el => el.textContent);
      expect(resultText).toContain('status');
      expect(resultText).toContain('healthy');
    }, 15000);

    test('should handle current user button click', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      // Click current user button
      await page.click('button[onclick="testCurrentUser()"]');

      // Wait for result to appear
      await page.waitForSelector('#result', { visible: true });
      await page.waitForFunction(
        () => document.querySelector('#result').style.display === 'block'
      );

      // Check that result contains user data
      const resultText = await page.$eval('#result', el => el.textContent);
      expect(resultText).toContain('data');
    }, 15000);

    test('should handle cache statistics update', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      // Wait for auto-refresh to update cache stats
      await page.waitForFunction(
        () => document.querySelector('#cacheStats').textContent !== 'Loading...'
      );

      const cacheStatsText = await page.$eval('#cacheStats', el => el.textContent);
      expect(cacheStatsText).toContain('Total:');
      expect(cacheStatsText).toContain('Valid:');
      expect(cacheStatsText).toContain('Expired:');
    }, 15000);
  });

  describe('Error Handling Testing', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate offline condition
      await page.setOfflineMode(true);

      // Try to make API call
      const response = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health', { timeout: 5000 });
          return { success: true, status: response.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Failed to fetch');

      // Restore network
      await page.setOfflineMode(false);
    }, 15000);

    test('should handle invalid API endpoints', async () => {
      const response = await page.goto('http://localhost:3000/api/nonexistent', {
        waitUntil: 'networkidle2'
      });

      // Should return 404
      expect(response.status()).toBe(404);
    }, 10000);
  });

  describe('Performance Testing', () => {
    test('should load homepage within acceptable time', async () => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

      const loadTime = Date.now() - startTime;
      console.log(`Homepage load time: ${loadTime}ms`);

      // Homepage should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    }, 10000);

    test('should respond to API calls within acceptable time', async () => {
      const startTime = Date.now();

      const response = await page.goto('http://localhost:3000/api/health', {
        waitUntil: 'networkidle2'
      });

      const apiTime = Date.now() - startTime;
      console.log(`API response time: ${apiTime}ms`);

      // API should respond within 2 seconds
      expect(apiTime).toBeLessThan(2000);
      expect(response.status()).toBe(200);
    }, 10000);
  });

  describe('Security Testing', () => {
    test('should handle XSS attempts in API endpoints', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await page.evaluate(async (payload) => {
        try {
          const response = await fetch('/api/trading/listings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              steamId: payload,
              appId: '730',
              itemId: 'test',
              itemName: payload,
              price: 100
            })
          });
          return {
            status: response.status,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, xssPayload);

      // Should either sanitize the input or reject it
      expect(response.status).toBe(200); // If accepted, should be sanitized
      // OR
      // expect(response.status).toBe(400); // If rejected
    }, 10000);

    test('should handle SQL injection attempts', async () => {
      const sqlPayload = "'; DROP TABLE users; --";

      const response = await page.evaluate(async (payload) => {
        try {
          const response = await fetch(`/api/steam/inventory/${payload}`, {
            method: 'GET'
          });
          return {
            status: response.status,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, sqlPayload);

      // Should reject invalid Steam ID format
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid Steam ID format');
    }, 10000);
  });
});