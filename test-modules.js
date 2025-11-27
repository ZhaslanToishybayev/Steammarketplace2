// Simple test to check module loading
try {
  const EnhancedSteamInventory = require('./enhanced-steam-inventory');
  console.log('EnhancedSteamInventory loaded:', EnhancedSteamInventory !== undefined);
  console.log('EnhancedSteamInventory type:', typeof EnhancedSteamInventory);
} catch(e) {
  console.error('Error loading EnhancedSteamInventory:', e.message);
}

try {
  const BasicTradingSystem = require('./basic-trading-system');
  console.log('BasicTradingSystem loaded:', BasicTradingSystem !== undefined);
  console.log('BasicTradingSystem type:', typeof BasicTradingSystem);
} catch(e) {
  console.error('Error loading BasicTradingSystem:', e.message);
}