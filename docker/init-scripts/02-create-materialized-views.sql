-- Steam Marketplace Materialized Views for Analytics
-- These views provide pre-computed aggregations for dashboard and reporting

-- User statistics materialized view
CREATE MATERIALIZED VIEW mv_user_statistics AS
SELECT
    u."id" as user_id,
    u."steamId",
    u."username",
    u."createdAt" as user_created_at,
    u."lastLoginAt",
    u."isVerified",
    u."isActive",
    u."isBanned",
    u."role",
    -- Trade statistics
    COUNT(DISTINCT t."id") as total_trades,
    COUNT(DISTINCT CASE WHEN t."status" = 'completed' THEN t."id" END) as completed_trades,
    COUNT(DISTINCT CASE WHEN t."status" = 'pending' THEN t."id" END) as pending_trades,
    COUNT(DISTINCT CASE WHEN t."status" = 'failed' THEN t."id" END) as failed_trades,
    COUNT(DISTINCT CASE WHEN t."status" = 'cancelled' THEN t."id" END) as cancelled_trades,
    COUNT(DISTINCT CASE WHEN t."type" = 'deposit' THEN t."id" END) as deposit_trades,
    COUNT(DISTINCT CASE WHEN t."type" = 'withdraw' THEN t."id" END) as withdraw_trades,
    COUNT(DISTINCT CASE WHEN t."type" = 'p2p' THEN t."id" END) as p2p_trades,
    COALESCE(AVG(CASE WHEN t."status" = 'completed' THEN t."totalItemsToReceive" END), 0) as avg_items_received,
    COALESCE(AVG(CASE WHEN t."status" = 'completed' THEN t."totalItemsToGive" END), 0) as avg_items_given,
    -- Success rate
    CASE
        WHEN COUNT(DISTINCT t."id") > 0
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN t."status" = 'completed' THEN t."id" END)::decimal / COUNT(DISTINCT t."id")::decimal) * 100,
            2
        )
        ELSE 0
    END as success_rate_percentage,
    -- Last trade activity
    MAX(t."createdAt") as last_trade_at,
    MAX(CASE WHEN t."status" = 'completed' THEN t."completedAt" END) as last_completed_trade_at,
    -- Inventory statistics
    COUNT(DISTINCT i."id") as total_inventory_items,
    COUNT(DISTINCT CASE WHEN i."tradable" = true THEN i."id" END) as tradable_items,
    COUNT(DISTINCT CASE WHEN i."marketable" = true THEN i."id" END) as marketable_items,
    COUNT(DISTINCT i."appId") as games_with_items,
    -- Transaction statistics
    COUNT(DISTINCT tr."id") as total_transactions,
    COUNT(DISTINCT CASE WHEN tr."status" = 'completed' THEN tr."id" END) as completed_transactions,
    COUNT(DISTINCT CASE WHEN tr."type" = 'deposit' THEN tr."id" END) as deposit_count,
    COUNT(DISTINCT CASE WHEN tr."type" = 'withdrawal' THEN tr."id" END) as withdrawal_count,
    COUNT(DISTINCT CASE WHEN tr."type" = 'trade_credit' THEN tr."id" END) as trade_credit_count,
    COUNT(DISTINCT CASE WHEN tr."type" = 'trade_debit' THEN tr."id" END) as trade_debit_count,
    COALESCE(SUM(CASE WHEN tr."status" = 'completed' THEN tr."amount" END), 0) as total_volume,
    COALESCE(AVG(CASE WHEN tr."status" = 'completed' THEN tr."amount" END), 0) as avg_transaction_amount,
    MAX(tr."createdAt") as last_transaction_at
FROM users u
LEFT JOIN trades t ON u."id" = t."userId"
LEFT JOIN inventory i ON u."id" = i."userId"
LEFT JOIN transactions tr ON u."id" = tr."userId"
WHERE u."isActive" = true
GROUP BY u."id", u."steamId", u."username", u."createdAt", u."lastLoginAt", u."isVerified", u."isActive", u."isBanned", u."role";

-- Create index on materialized view
CREATE UNIQUE INDEX ON mv_user_statistics(user_id);
CREATE INDEX ON mv_user_statistics(success_rate_percentage);
CREATE INDEX ON mv_user_statistics(total_trades);
CREATE INDEX ON mv_user_statistics(last_trade_at);

-- Item price summary materialized view
CREATE MATERIALIZED VIEW mv_item_price_summary AS
SELECT
    "appId",
    "marketHashName",
    -- Latest price information
    MAX("priceDate") as last_updated,
    MAX(CASE WHEN "priceDate" = (SELECT MAX("priceDate") FROM item_prices ip2 WHERE ip2."appId" = ip."appId" AND ip2."marketHashName" = ip."marketHashName") THEN "price" END) as current_price,
    MAX(CASE WHEN "priceDate" = (SELECT MAX("priceDate") FROM item_prices ip2 WHERE ip2."appId" = ip."appId" AND ip2."marketHashName" = ip."marketHashName") THEN "source" END) as current_source,
    -- 24h changes
    LAG(MAX(CASE WHEN "priceDate" >= NOW() - INTERVAL '24 hours' THEN "price" END)) OVER (PARTITION BY "appId", "marketHashName" ORDER BY MAX("priceDate")) as price_24h_ago,
    CASE
        WHEN LAG(MAX(CASE WHEN "priceDate" >= NOW() - INTERVAL '24 hours' THEN "price" END)) OVER (PARTITION BY "appId", "marketHashName" ORDER BY MAX("priceDate")) > 0
        THEN ROUND(
            ((MAX(CASE WHEN "priceDate" = (SELECT MAX("priceDate") FROM item_prices ip2 WHERE ip2."appId" = ip."appId" AND ip2."marketHashName" = ip."marketHashName") THEN "price" END) -
              LAG(MAX(CASE WHEN "priceDate" >= NOW() - INTERVAL '24 hours' THEN "price" END)) OVER (PARTITION BY "appId", "marketHashName" ORDER BY MAX("priceDate"))) /
             LAG(MAX(CASE WHEN "priceDate" >= NOW() - INTERVAL '24 hours' THEN "price" END)) OVER (PARTITION BY "appId", "marketHashName" ORDER BY MAX("priceDate"))) * 100,
            2
        )
        ELSE 0
    END as change_24h_percentage,
    -- Volume statistics
    SUM("volume") as total_volume_24h,
    AVG("price") as avg_price_24h,
    MIN("price") as min_price_24h,
    MAX("price") as max_price_24h,
    -- 7-day average
    AVG(CASE WHEN "priceDate" >= NOW() - INTERVAL '7 days' THEN "price" END) as avg_price_7d,
    -- Trade count (estimated from volume)
    COUNT(*) as price_updates_count,
    -- Source breakdown
    COUNT(DISTINCT "source") as sources_count
FROM item_prices ip
WHERE "priceDate" >= NOW() - INTERVAL '7 days'
GROUP BY "appId", "marketHashName";

-- Create index on materialized view
CREATE UNIQUE INDEX ON mv_item_price_summary("appId", "marketHashName");
CREATE INDEX ON mv_item_price_summary(current_price);
CREATE INDEX ON mv_item_price_summary(change_24h_percentage);
CREATE INDEX ON mv_item_price_summary(total_volume_24h);

-- Trade analytics materialized view
CREATE MATERIALIZED VIEW mv_trade_analytics AS
SELECT
    DATE("createdAt") as trade_date,
    DATE_TRUNC('hour', "createdAt") as trade_hour,
    -- Overall statistics
    COUNT(*) as total_trades,
    COUNT(CASE WHEN "status" = 'completed' THEN 1 END) as completed_trades,
    COUNT(CASE WHEN "status" = 'pending' THEN 1 END) as pending_trades,
    COUNT(CASE WHEN "status" = 'failed' THEN 1 END) as failed_trades,
    COUNT(CASE WHEN "status" = 'cancelled' THEN 1 END) as cancelled_trades,
    -- Success rate
    ROUND(
        (COUNT(CASE WHEN "status" = 'completed' THEN 1 END)::decimal / COUNT(*)::decimal) * 100,
        2
    ) as success_rate,
    -- Type breakdown
    COUNT(CASE WHEN "type" = 'deposit' THEN 1 END) as deposit_trades,
    COUNT(CASE WHEN "type" = 'withdraw' THEN 1 END) as withdraw_trades,
    COUNT(CASE WHEN "type" = 'p2p' THEN 1 END) as p2p_trades,
    -- Value statistics (assuming we have trade values)
    AVG("totalItemsToReceive" + "totalItemsToGive") as avg_items_per_trade,
    SUM("totalItemsToReceive" + "totalItemsToGive") as total_items_traded,
    -- Bot vs User trades
    COUNT(CASE WHEN "botId" IS NOT NULL THEN 1 END) as bot_trades,
    COUNT(CASE WHEN "botId" IS NULL THEN 1 END) as user_trades,
    -- Escrow usage
    COUNT(CASE WHEN "hasEscrow" = true THEN 1 END) as escrow_trades,
    -- Peak hours
    EXTRACT(hour FROM "createdAt") as hour_of_day
FROM trades
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt"), DATE_TRUNC('hour', "createdAt"), EXTRACT(hour FROM "createdAt")
ORDER BY trade_date DESC, trade_hour DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX ON mv_trade_analytics(trade_date, trade_hour);
CREATE INDEX ON mv_trade_analytics(success_rate);
CREATE INDEX ON mv_trade_analytics(total_trades);

-- Refresh strategies
-- These views should be refreshed periodically using cron jobs or scheduled tasks
-- Example cron jobs:
-- 0 */5 * * * psql -d steam_marketplace -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_statistics;"
-- 0 */1 * * * psql -d steam_marketplace -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_item_price_summary;"
-- 0 0 * * * psql -d steam_marketplace -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trade_analytics;"

-- Grant permissions
GRANT SELECT ON mv_user_statistics TO steam_user;
GRANT SELECT ON mv_item_price_summary TO steam_user;
GRANT SELECT ON mv_trade_analytics TO steam_user;