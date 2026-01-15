# 🚀 Tally Automation - Advanced Accounting Entry System

A modern, powerful web application that automates accounting entries in Tally using the Tally API. Reduce redundant work, eliminate manual data entry, and streamline your accounting workflow.

![Tally Automation](https://img.shields.io/badge/Tally-Automation-00d4ff?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## ✨ Features

### 🎯 Core Functionality
- **Automated Voucher Creation** - Create Journal, Payment, Receipt, Sales, Purchase, and Contra vouchers
- **Ledger Management** - Create and manage ledgers programmatically
- **Bulk Import** - Process multiple vouchers at once via JSON
- **Real-time Connection** - Live connection status with Tally
- **Data Validation** - Automatic debit-credit balance validation
- **Error Handling** - Comprehensive error messages and alerts

### 💎 Premium Features
- **Beautiful UI** - Modern dark theme with smooth animations
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Real-time Feedback** - Instant success/error notifications
- **Dynamic Forms** - Add/remove ledger entries on the fly
- **Data Viewing** - Browse companies and ledgers directly from Tally

## 🛠️ Technology Stack

- **Backend**: Node.js + Express
- **Tally Integration**: XML-based Tally API
- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **Styling**: Custom CSS with modern design system
- **Data Format**: XML ↔ JSON conversion

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Tally Prime/ERP 9** installed and running
2. **Tally ODBC/API Server** enabled
3. **Node.js** (v14 or higher) installed
4. A company created in Tally

## 🚀 Quick Start

### 1. Enable Tally API

Open Tally and enable the API server:

```
1. Press F12 (Configure)
2. Go to "Advanced Configuration"
3. Enable "TallyPrime Server" or "ODBC Server"
4. Set Port: 9000 (default)
5. Enable "Accept connections from all IPs" (if needed)
6. Save and restart Tally
```

### 2. Install the Application

```bash
# Clone or download this repository
cd tally-automation

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your Tally settings
```

### 3. Configure Settings

Edit the `.env` file:

```env
TALLY_HOST=localhost
TALLY_PORT=9000
TALLY_COMPANY_NAME=Your Company Name
PORT=3000
NODE_ENV=development
```

### 4. Start the Server

```bash
npm start
```

The application will be available at: **http://localhost:3000**

## 📖 Usage Guide

### Creating a Voucher

1. **Select Company** - Enter your Tally company name
2. **Choose Voucher Type** - Journal, Payment, Receipt, Sales, Purchase, or Contra
3. **Set Date** - Format: YYYYMMDD (e.g., 20260115)
4. **Add Ledger Entries**:
   - Minimum 2 entries required
   - Specify ledger name, amount, and type (Dr/Cr)
   - Debit and Credit must balance
5. **Add Narration** - Optional description
6. **Click "Create Voucher"** - Entry will be posted to Tally

### Creating a Ledger

1. **Enter Company Name**
2. **Specify Ledger Name** - e.g., "HDFC Bank"
3. **Select Parent Group** - e.g., "Bank Accounts"
4. **Set Opening Balance** - Optional, defaults to 0
5. **Click "Create Ledger"** - Ledger will be created in Tally

### Bulk Import

Upload a JSON file or paste JSON data with multiple vouchers:

```json
[
  {
    "voucherType": "Journal",
    "date": "20260115",
    "companyName": "ABC Ltd",
    "narration": "Opening Entry",
    "ledgerEntries": [
      {
        "ledgerName": "Cash",
        "amount": 10000,
        "isDeemedPositive": "No"
      },
      {
        "ledgerName": "Capital Account",
        "amount": 10000,
        "isDeemedPositive": "Yes"
      }
    ]
  }
]
```

## 🔌 API Endpoints

### Connection
- `GET /api/tally/test-connection` - Test Tally connection

### Companies & Ledgers
- `GET /api/tally/companies` - Get list of companies
- `POST /api/tally/ledgers` - Get ledgers for a company
- `POST /api/tally/create-ledger` - Create a new ledger

### Vouchers
- `POST /api/tally/create-voucher` - Create a single voucher
- `POST /api/tally/bulk-vouchers` - Create multiple vouchers
- `POST /api/tally/vouchers` - Get vouchers for date range

## 📁 Project Structure

```
tally-automation/
├── server.js              # Express server
├── routes/
│   └── tally.js          # API routes
├── utils/
│   └── tallyConnector.js # Tally API connector
├── public/
│   ├── index.html        # Main UI
│   ├── styles.css        # Styling
│   └── app.js            # Frontend logic
├── .env                  # Configuration
├── .env.example          # Configuration template
├── package.json          # Dependencies
└── README.md            # Documentation
```

## 🎨 UI Features

- **Dark Theme** - Easy on the eyes for long working hours
- **Smooth Animations** - Polished user experience
- **Real-time Validation** - Instant feedback on form inputs
- **Responsive Layout** - Works on all screen sizes
- **Status Indicators** - Visual connection status
- **Alert System** - Success/error notifications

## 🔧 Troubleshooting

### Connection Failed

**Problem**: Cannot connect to Tally

**Solutions**:
1. Ensure Tally is running
2. Verify ODBC/API server is enabled in Tally (F12 → Advanced Configuration)
3. Check if port 9000 is not blocked by firewall
4. Confirm company is open in Tally

### Voucher Creation Failed

**Problem**: Voucher not created in Tally

**Solutions**:
1. Verify ledger names exist in Tally (case-sensitive)
2. Ensure debit and credit amounts are balanced
3. Check date format (YYYYMMDD)
4. Verify company name is correct

### Ledger Not Found

**Problem**: Ledger names not recognized

**Solutions**:
1. Ledger names are case-sensitive
2. Create ledgers in Tally first or use the "Create Ledger" feature
3. Use exact ledger names as they appear in Tally

## 🌟 Advanced Features

### Custom Voucher Types

You can create custom voucher types by modifying the voucher type dropdown in `index.html`.

### Date Formats

The application uses Tally's date format (YYYYMMDD). The current date is auto-filled for convenience.

### Validation Rules

- Minimum 2 ledger entries required
- Debit and Credit must balance (within 0.01 tolerance)
- All required fields must be filled

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with ❤️ for accounting professionals
- Powered by Tally API
- Designed for efficiency and ease of use

## 📞 Support

For issues, questions, or suggestions:
1. Check the troubleshooting section
2. Review Tally API documentation
3. Open an issue on GitHub

## 🔮 Future Enhancements

- [ ] CSV import support
- [ ] Excel integration
- [ ] Scheduled recurring entries
- [ ] Advanced reporting
- [ ] Multi-company support
- [ ] User authentication
- [ ] Audit trail logging
- [ ] Email notifications
- [ ] Mobile app

---

**Made with 🚀 for automating Tally accounting entries**
