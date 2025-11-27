// Simple test to debug the import issue
console.log('Starting import test...');

try {
  console.log('1. Testing EnhancedSteamInventory import...');
  const EnhancedSteamInventory = require('./enhanced-steam-inventory');
  console.log('1. EnhancedSteamInventory import result:', typeof EnhancedSteamInventory);
  console.log('1. EnhancedSteamInventory is truthy:', !!EnhancedSteamInventory);
} catch (e) {
  console.error('1. EnhancedSteamInventory import failed:', e.message);
}

try {
  console.log('2. Testing BasicTradingSystem import...');
  const BasicTradingSystem = require('./basic-trading-system');
  console.log('2. BasicTradingSystem import result:', typeof BasicTradingSystem);
  console.log('2. BasicTradingSystem is truthy:', !!BasicTradingSystem);
  console.log('2. BasicTradingSystem has trades property:', !!BasicTradingSystem && typeof BasicTradingSystem.trades);
} catch (e) {
  console.error('2. BasicTradingSystem import failed:', e.message);
}

try {
  console.log('3. Testing both imports together...');
  const EnhancedSteamInventory = require('./enhanced-steam-inventory');
  const BasicTradingSystem = require('./basic-trading-system');
  console.log('3. Both imports successful');
  console.log('3. BasicTradingSystem.trades type:', typeof BasicTradingSystem.trades);
  console.log('3. BasicTradingSystem.trades has clear method:', typeof BasicTradingSystem.trades.clear);
} catch (e) {
  console.error('3. Combined import failed:', e.message);
}