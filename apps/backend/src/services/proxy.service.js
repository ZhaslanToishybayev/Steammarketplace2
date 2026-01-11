/**
 * Proxy Service
 * Manages a pool of proxies for bypassing rate limits
 */

const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ProxyService {
    constructor() {
        this.proxies = [];
        this.currentIndex = 0;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

        // Load proxies on init
        this.loadProxies();
    }

    /**
     * Load proxies from proxies.txt or ENV
     * Format: ip:port or user:pass@ip:port or protocol://user:pass@ip:port
     */
    loadProxies() {
        this.proxies = [];

        // 1. Try file
        const filePath = path.join(process.cwd(), 'proxies.txt');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.proxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            console.log(`[ProxyManager] Loaded ${this.proxies.length} proxies from file`);
        }

        // 2. Try ENV (comma separated)
        if (this.proxies.length === 0 && process.env.PROXIES) {
            this.proxies = process.env.PROXIES.split(',')
                .map(p => p.trim())
                .filter(p => p);
            console.log(`[ProxyManager] Loaded ${this.proxies.length} proxies from ENV`);
        }

        if (this.proxies.length === 0) {
            console.warn('[ProxyManager] No proxies found! Requests will be direct.');
        }
    }

    /**
     * Get next proxy agent (Round Robin)
     */
    getNextProxyAgent() {
        if (this.proxies.length === 0) return null;

        const proxyUrl = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

        // Ensure protocol
        const formattedUrl = proxyUrl.includes('://') ? proxyUrl : `http://${proxyUrl}`;

        return new HttpsProxyAgent(formattedUrl);
    }

    /**
     * Get basic axios config with proxy agent
     */
    getAxiosConfig() {
        const agent = this.getNextProxyAgent();

        const config = {
            headers: {
                'User-Agent': this.userAgent,
                'Referer': 'https://steamcommunity.com'
            },
            timeout: 10000
        };

        if (agent) {
            config.httpsAgent = agent;
            config.proxy = false; // Disable default axios proxy handling to use agent
        }

        return config;
    }

    /**
     * Report a bad proxy (optional: remove or cool down)
     */
    reportBadProxy(agent) {
        // For now, just log. In future, we could temporarily blacklist.
        if (agent && agent.proxy) {
            console.warn(`[ProxyManager] Request failed with proxy: ${agent.proxy.host}`);
        }
    }
}

const proxyService = new ProxyService();

module.exports = {
    ProxyService,
    proxyService
};
