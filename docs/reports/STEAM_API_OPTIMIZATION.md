# Steam API Performance Monitoring and Optimization

## Overview
This document describes the Steam API performance optimization system with Redis caching, monitoring, and fallback mechanisms.

## Architecture

### 1. Steam API Manager
- **Purpose**: Central service that manages both standard and optimized Steam API
- **Features**:
  - Automatic fallback to standard API if optimized fails
  - Performance monitoring and metrics collection
  - Configurable API mode switching
  - Rate limiting and cache management

### 2. Optimized Steam API Service
- **Purpose**: High-performance Steam API with Redis caching
- **Features**:
  - Redis-based persistent caching
  - In-memory cache for frequent requests
  - Rate limiting with configurable windows
  - Comprehensive error handling and metrics

### 3. Cache Strategy
- **L1 Cache**: In-memory Map (1 minute TTL)
- **L2 Cache**: Redis (configurable TTL)
- **Cache Types**:
  - Inventory: 5 minutes
  - Player Info: 10 minutes
  - Market Prices: 30 minutes

## API Endpoints

### Steam Optimized API
```
GET /api/steam-optimized/inventory/:steamId
GET /api/steam-optimized/player/:steamId
GET /api/steam-optimized/cache/stats
POST /api/steam-optimized/cache/invalidate/:steamId
GET /api/steam-optimized/health
POST /api/steam-optimized/admin/toggle-optimized
```

### Performance Metrics
- Cache hit rate
- Response time tracking
- API call count
- Redis memory usage
- Fallback count

## Configuration

### Environment Variables
```bash
ENABLE_OPTIMIZED_STEAM_API=true
STEAM_CACHE_TTL_INVENTORY=300
STEAM_CACHE_TTL_PLAYER=600
STEAM_CACHE_TTL_MARKET=1800
STEAM_RATE_LIMIT=30
STEAM_RATE_WINDOW=60000
STEAM_ENABLE_METRICS=true
```

### Redis Configuration
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=1  # Separate DB for Steam cache
```

## Performance Benefits

### Expected Improvements
- **Response Time**: 60-80% faster for cached requests
- **API Calls**: 70-90% reduction in Steam API calls
- **Concurrent Users**: 3-5x better concurrent handling
- **Cost Reduction**: Significant reduction in Steam API usage

### Cache Performance
- **Hit Rate**: 80-95% for popular users
- **Memory Usage**: ~50-200MB Redis memory
- **Cache Invalidation**: Real-time when needed

## Monitoring

### Health Checks
- Steam API connectivity
- Redis cache status
- Rate limiting status
- Performance metrics

### Metrics Collection
- Cache hit/miss ratio
- Response time percentiles
- Error rates
- Fallback frequency

### Alerting
- Cache miss rate > 50%
- Response time > 2 seconds
- Redis connection failures
- Steam API rate limit hits

## Deployment

### Quick Deployment
```bash
# Apply optimization patch
./deploy-steam-optimization.sh

# Verify deployment
curl http://localhost:3001/api/steam-optimized/health
```

### Docker Integration
The optimization works with existing Docker setup without requiring rebuilds.

### Rollback
```bash
# Switch back to standard API
curl -X POST http://localhost:3001/api/steam-optimized/admin/toggle-optimized \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## Troubleshooting

### Common Issues
1. **Redis Connection Failed**: Check Redis service and credentials
2. **Cache Misses Too High**: Check TTL settings and cache keys
3. **Rate Limiting**: Adjust STEAM_RATE_LIMIT settings
4. **Fallback Too Frequent**: Check Redis performance and network

### Logs
- Steam API Manager logs: Mode changes and fallbacks
- Optimized API logs: Cache hits/misses and performance
- Redis logs: Connection and performance issues

## Security
- Redis password protection required
- Environment variable encryption recommended
- API key protection through environment variables
- Rate limiting prevents abuse