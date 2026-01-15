const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const tallyRoutes = require('./routes/tally');
const bankStatementRoutes = require('./routes/bankStatement');
const ledgerTransferRoutes = require('./routes/ledgerTransfer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api/tally', tallyRoutes);
app.use('/api/bank-statement', bankStatementRoutes);
app.use('/api/ledger-transfer', ledgerTransferRoutes);

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Tally Automation Server running on http://localhost:${PORT}`);
  console.log(`📊 Tally Host: ${process.env.TALLY_HOST}:${process.env.TALLY_PORT}`);
});
