/**
 * Pricing API Routes
 * Exposes external pricing service endpoints
 */

const express = require('express');
const router = express.Router();
const pricingService = require('../services/external-pricing.service');
const { priceEngine } = require('../services/price-engine.service');

// Get best price for an item
router.get('/item/:marketHashName', async (req, res) => {
    try {
        const { marketHashName } = req.params;
        const { appId = 730, preferBuff = true } = req.query;

        const priceData = await pricingService.getBestPrice(
            decodeURIComponent(marketHashName),
            { appId: parseInt(appId), preferBuff: preferBuff !== 'false' }
        );

        res.json({
            success: true,
            data: priceData
        });
    } catch (error) {
        console.error('Price fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch price' });
    }
});

// Get Steam Market price directly
router.get('/steam/:marketHashName', async (req, res) => {
    try {
        const { marketHashName } = req.params;
        const { appId = 730 } = req.query;

        const priceData = await pricingService.getSteamMarketPrice(
            decodeURIComponent(marketHashName),
            parseInt(appId)
        );

        if (!priceData) {
            return res.status(404).json({ success: false, error: 'Price not found on Steam Market' });
        }

        res.json({
            success: true,
            data: priceData
        });
    } catch (error) {
        console.error('Steam price fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch Steam price' });
    }
});

// Get SteamAnalyst price
router.get('/steamanalyst/:marketHashName', async (req, res) => {
    try {
        const { marketHashName } = req.params;

        const priceData = await pricingService.getSteamAnalystPrice(
            decodeURIComponent(marketHashName)
        );

        if (!priceData) {
            return res.status(404).json({ success: false, error: 'Price not found on SteamAnalyst' });
        }

        res.json({
            success: true,
            data: priceData
        });
    } catch (error) {
        console.error('SteamAnalyst price fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch SteamAnalyst price' });
    }
});

// Get price comparison from all sources
router.get('/compare/:marketHashName', async (req, res) => {
    try {
        const { marketHashName } = req.params;
        const decoded = decodeURIComponent(marketHashName);

        const [buffData, steamData, analytData] = await Promise.all([
            pricingService.getBuffPrice(decoded),
            pricingService.getSteamMarketPrice(decoded, 730),
            pricingService.getSteamAnalystPrice(decoded)
        ]);

        res.json({
            success: true,
            data: {
                marketHashName: decoded,
                sources: {
                    buff163: buffData?.price || null,
                    steam: steamData?.lowestPrice || null,
                    steamanalyst: analytData?.price || null
                },
                trend: analytData?.trend || null,
                volume: steamData?.volume || 0,
                recommendation: buffData?.price ? 'Use Buff163 price (most accurate)' : 'Use Steam Market price',
                timestamp: Date.now()
            }
        });
    } catch (error) {
        console.error('Price compare error:', error);
        res.status(500).json({ success: false, error: 'Failed to compare prices' });
    }
});

// Get price history
router.get('/history/:marketHashName', async (req, res) => {
    try {
        const { marketHashName } = req.params;
        const { days = 30 } = req.query;

        const history = await priceEngine.getPriceHistory(decodeURIComponent(marketHashName), parseInt(days));

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Price history error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch price history' });
    }
});

// Get detailed item valuation
router.post('/valuation', async (req, res) => {
    try {
        const { marketHashName, inspectLink, stickers, floatValue, paintIndex, paintSeed } = req.body;

        if (!marketHashName) {
            return res.status(400).json({ success: false, error: 'marketHashName required' });
        }

        const valuation = await pricingService.calculateItemValue({
            marketHashName,
            inspectLink,
            stickers: stickers || [],
            floatValue,
            paintIndex,
            paintSeed
        });

        res.json({
            success: true,
            data: valuation
        });
    } catch (error) {
        console.error('Valuation error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate valuation' });
    }
});

// Batch price lookup
router.post('/batch', async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, error: 'items array required' });
        }

        if (items.length > 50) {
            return res.status(400).json({ success: false, error: 'Max 50 items per request' });
        }

        const results = await Promise.all(
            items.map(async (item) => {
                try {
                    const price = await pricingService.getBestPrice(item.marketHashName);
                    return { marketHashName: item.marketHashName, ...price };
                } catch (e) {
                    return { marketHashName: item.marketHashName, error: e.message };
                }
            })
        );

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Batch price error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prices' });
    }
});

// Get sticker price
router.get('/sticker/:stickerName', async (req, res) => {
    try {
        const { stickerName } = req.params;
        const price = await pricingService.getStickerPrice(decodeURIComponent(stickerName));

        res.json({
            success: true,
            data: price
        });
    } catch (error) {
        console.error('Sticker price error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sticker price' });
    }
});

// Get CSFloat data from inspect link
router.post('/inspect', async (req, res) => {
    try {
        const { inspectLink } = req.body;

        if (!inspectLink) {
            return res.status(400).json({ success: false, error: 'inspectLink required' });
        }

        const data = await pricingService.getCSFloatData(inspectLink);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Inspect error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch item data' });
    }
});

// Pattern detection
router.post('/pattern', async (req, res) => {
    try {
        const { paintIndex, paintSeed } = req.body;

        const phase = pricingService.detectDopplerPhase(paintIndex, paintSeed);
        const fadePercent = pricingService.detectFadePercentage(paintIndex, paintSeed);
        const marblePattern = pricingService.detectMarbleFadePattern(paintIndex, paintSeed);

        res.json({
            success: true,
            data: {
                phase,
                fadePercent,
                marblePattern
            }
        });
    } catch (error) {
        console.error('Pattern detection error:', error);
        res.status(500).json({ success: false, error: 'Failed to detect pattern' });
    }
});

module.exports = router;
