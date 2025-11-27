const http = require('http');

// Test route mapping
const routes = {
  '/test': (req, res) => {
    res.writeHead(200);
    res.end('Test route works!');
  },
  '/auth/steam/return': (req, res) => {
    res.writeHead(200);
    res.end('Steam callback works!');
  }
};

const server = http.createServer((req, res) => {
  console.log(`🔍 Request for: ${req.url}`);
  console.log(`🔍 Available routes:`, Object.keys(routes));

  const routeHandler = routes[req.url];
  if (routeHandler) {
    console.log(`✅ Found route handler for: ${req.url}`);
    routeHandler(req, res);
  } else {
    console.log(`❌ Route not found: ${req.url}`);
    res.writeHead(404);
    res.end('Route not found');
  }
});

server.listen(3009, () => {
  console.log('🔍 Route debugging server started on port 3009');
});