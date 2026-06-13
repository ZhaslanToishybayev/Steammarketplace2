const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is working!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});