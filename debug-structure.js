// Debug the BasicTradingSystem structure
console.log('Debugging BasicTradingSystem structure...');

try {
  const BasicTradingSystem = require('./basic-trading-system');
  console.log('BasicTradingSystem type:', typeof BasicTradingSystem);
  console.log('BasicTradingSystem keys:', Object.keys(BasicTradingSystem));
  console.log('BasicTradingSystem properties:', Object.getOwnPropertyNames(BasicTradingSystem));
  console.log('BasicTradingSystem trades property:', BasicTradingSystem.trades);
  console.log('BasicTradingSystem offers property:', BasicTradingSystem.offers);
  console.log('BasicTradingSystem listings property:', BasicTradingSystem.listings);
  console.log('BasicTradingSystem constructor:', BasicTradingSystem.constructor);
  console.log('BasicTradingSystem toString:', BasicTradingSystem.toString());
} catch (e) {
  console.error('Error:', e.message);
}