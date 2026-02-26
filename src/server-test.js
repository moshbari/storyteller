const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(3002, () => {
  console.log('Test server on 3002');
});
