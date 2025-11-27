const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'API is working!' }));
  } else if (req.method === 'GET' && req.url === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Test endpoint working!' }));
  } else if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Simple API Server is running!\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3004;
server.listen(PORT, () => {
  console.log(`🚀 Simple HTTP API Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Test: http://localhost:${PORT}/api/test`);
  console.log(`   - Root: http://localhost:${PORT}/`);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down API server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down API server...');
  server.close(() => process.exit(0));
});