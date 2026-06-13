#!/bin/bash

# Manual Steam API Optimization Deployment
# This script applies the optimization without file copying issues

echo "🔧 Starting Manual Steam API Optimization..."

# Check if backend container is running
if ! docker ps | grep -q steam_backend; then
    echo "❌ Backend container not found"
    exit 1
fi

# Create patch script content with correct absolute path
PATCH_CONTENT='// Steam API Optimization Patch
// This patch enables Redis-based caching for Steam API calls without rebuilding Docker image

const fs = require("fs");
const path = require("path");

const serverPath = "/app/src/server.js";
const backupPath = "/app/src/server.js.backup";

console.log("[SteamAPI Patch] Applying Redis caching optimization...");

try {
    // Read current server.js
    const serverContent = fs.readFileSync(serverPath, "utf8");

    // Check if patch already applied
    if (serverContent.includes("steamApiManager")) {
        console.log("[SteamAPI Patch] Patch already applied!");
        process.exit(0);
    }

    // Create backup
    fs.writeFileSync(backupPath, serverContent);
    console.log("[SteamAPI Patch] Backup created at server.js.backup");

    // Add steam API manager route
    const newSteamRoutes = `const steamCacheRoutes = require("./routes/steam-cache");
const steamManagerRoutes = require("./routes/steam-manager");

app.use("/api/auth", authRoutes);
app.use("/api/mock-auth", mockAuthRoutes); // Mock auth for testing
app.use("/auth", authRoutes); // Fallback for compatibility
app.use("/api/inventory", inventoryRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/instant", instantRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/steam", steamCacheRoutes);
app.use("/api/steam-optimized", steamManagerRoutes);`;

    // Replace old steam routes with new ones
    const updatedContent = serverContent.replace(
        /const steamCacheRoutes = require\(".\/routes\/steam-cache"\);\n\napp\.use\(\/api\/auth/,
        newSteamRoutes
    );

    // Write updated server.js
    fs.writeFileSync(serverPath, updatedContent);

    console.log("[SteamAPI Patch] Successfully applied!");
    console.log("[SteamAPI Patch] New endpoints available:");
    console.log("  - /api/steam-optimized/inventory/:steamId");
    console.log("  - /api/steam-optimized/player/:steamId");
    console.log("  - /api/steam-optimized/cache/stats");
    console.log("  - /api/steam-optimized/cache/invalidate/:steamId");
    console.log("  - /api/steam-optimized/health");
    console.log("  - /api/steam-optimized/admin/toggle-optimized");

} catch (error) {
    console.error("[SteamAPI Patch] Failed to apply patch:", error.message);
    process.exit(1);
}'

# Write patch script directly to container
echo "$PATCH_CONTENT" | docker exec -i steam_backend sh -c 'cat > /tmp/apply-steam-patch.js'

if [ $? -eq 0 ]; then
    echo "✅ Patch script written to container"
else
    echo "❌ Failed to write patch script"
    exit 1
fi

# Execute patch script
docker exec steam_backend node /tmp/apply-steam-patch.js

if [ $? -eq 0 ]; then
    echo "✅ Steam API optimization applied successfully"
else
    echo "❌ Failed to apply Steam API optimization"
    exit 1
fi

# Restart backend container
echo "🔄 Restarting backend container..."
docker restart steam_backend

if [ $? -eq 0 ]; then
    echo "✅ Backend container restarted"
else
    echo "❌ Failed to restart backend container"
    exit 1
fi

# Wait for container to be ready
sleep 10

# Test new endpoints
echo "🧪 Testing new Steam API endpoints..."

# Test health check
echo "Testing health check..."
curl -s http://localhost:3001/api/steam-optimized/health

# Test cache stats
echo "Testing cache stats..."
curl -s http://localhost:3001/api/steam-optimized/cache/stats

echo "✅ Manual Steam API optimization completed!"