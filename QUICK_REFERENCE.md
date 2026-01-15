# 📝 Tally Automation - Quick Reference Guide

## 🚀 Quick Start Commands

```bash
# Start the application
npm start

# The server will run on:
http://localhost:3000
```

## 🔧 Tally Configuration

### Enable Tally API (One-time setup)
1. Open Tally → Press `F12`
2. Advanced Configuration → Enable ODBC/TallyPrime Server
3. Port: `9000`
4. Save and restart Tally

## 📊 Common Voucher Examples

### 1. Cash Receipt
```json
{
  "voucherType": "Receipt",
  "date": "20260115",
  "companyName": "ABC Ltd",
  "narration": "Cash received from customer",
  "ledgerEntries": [
    {"ledgerName": "Cash", "amount": 10000, "isDeemedPositive": "No"},
    {"ledgerName": "Sales", "amount": 10000, "isDeemedPositive": "Yes"}
  ]
}
```

### 2. Payment Entry
```json
{
  "voucherType": "Payment",
  "date": "20260115",
  "companyName": "ABC Ltd",
  "narration": "Rent payment",
  "ledgerEntries": [
    {"ledgerName": "Rent", "amount": 15000, "isDeemedPositive": "No"},
    {"ledgerName": "Cash", "amount": 15000, "isDeemedPositive": "Yes"}
  ]
}
```

### 3. Journal Entry
```json
{
  "voucherType": "Journal",
  "date": "20260115",
  "companyName": "ABC Ltd",
  "narration": "Adjustment entry",
  "ledgerEntries": [
    {"ledgerName": "Bank Account", "amount": 5000, "isDeemedPositive": "No"},
    {"ledgerName": "Cash", "amount": 5000, "isDeemedPositive": "Yes"}
  ]
}
```

## 🎯 Debit vs Credit Quick Guide

| isDeemedPositive | Meaning | Common Use |
|-----------------|---------|------------|
| `"No"` | **Debit (Dr)** | Assets ↑, Expenses ↑, Liabilities ↓ |
| `"Yes"` | **Credit (Cr)** | Liabilities ↑, Income ↑, Assets ↓ |

### Examples:
- **Cash received**: Cash (Dr/No), Sales (Cr/Yes)
- **Payment made**: Expense (Dr/No), Cash (Cr/Yes)
- **Purchase**: Purchase (Dr/No), Cash (Cr/Yes)

## 📅 Date Format

Always use: `YYYYMMDD`

Examples:
- January 15, 2026 → `20260115`
- December 31, 2025 → `20251231`
- March 5, 2026 → `20260305`

## 🏢 Common Parent Groups for Ledgers

| Parent Group | Use For |
|-------------|---------|
| `Bank Accounts` | All bank accounts |
| `Cash-in-Hand` | Cash ledgers |
| `Sundry Debtors` | Customers/Receivables |
| `Sundry Creditors` | Suppliers/Payables |
| `Sales Accounts` | Revenue/Sales |
| `Purchase Accounts` | Purchases |
| `Direct Expenses` | COGS expenses |
| `Indirect Expenses` | Operating expenses |
| `Capital Account` | Owner's equity |
| `Loans & Advances (Asset)` | Loans given |
| `Secured Loans` | Loans taken |

## 🔌 API Endpoints Cheat Sheet

### Test Connection
```bash
GET http://localhost:3000/api/tally/test-connection
```

### Create Voucher
```bash
POST http://localhost:3000/api/tally/create-voucher
Content-Type: application/json

{
  "companyName": "ABC Ltd",
  "voucherType": "Journal",
  "date": "20260115",
  "narration": "Test entry",
  "ledgerEntries": [...]
}
```

### Create Ledger
```bash
POST http://localhost:3000/api/tally/create-ledger
Content-Type: application/json

{
  "companyName": "ABC Ltd",
  "name": "HDFC Bank",
  "parent": "Bank Accounts",
  "openingBalance": 0
}
```

### Get Companies
```bash
GET http://localhost:3000/api/tally/companies
```

### Get Ledgers
```bash
POST http://localhost:3000/api/tally/ledgers
Content-Type: application/json

{
  "companyName": "ABC Ltd"
}
```

## ⚠️ Common Errors & Fixes

| Error | Solution |
|-------|----------|
| Connection failed | 1. Check Tally is running<br>2. Verify ODBC is enabled<br>3. Check port 9000 |
| Company not found | Use exact company name (case-sensitive) |
| Ledger not found | Create ledger first or check spelling |
| Voucher not balanced | Ensure total Dr = total Cr |
| Port 3000 in use | Change PORT in .env file |

## 💡 Pro Tips

### 1. **Ledger Names**
- Always use exact names as in Tally
- Case-sensitive: "Cash" ≠ "cash"
- Create common ledgers first

### 2. **Bulk Import**
- Use `sample-vouchers.json` as template
- Validate JSON before importing
- Process in batches of 50-100

### 3. **Date Entry**
- Use today's date (auto-filled)
- Format: YYYYMMDD only
- No slashes or dashes

### 4. **Validation**
- Always balance Dr and Cr
- Minimum 2 ledger entries
- Check company name spelling

### 5. **Testing**
- Test connection first
- Create test voucher manually
- Then try bulk import

## 🎨 UI Navigation

### Tabs
1. **Create Voucher** - Single voucher entry
2. **Create Ledger** - New ledger creation
3. **Bulk Import** - Multiple vouchers
4. **View Data** - Browse companies/ledgers

### Status Indicator
- 🟢 Green = Connected
- 🔴 Red = Disconnected
- ⚪ Gray = Checking

## 📱 Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Submit form (when focused on button)
- `Ctrl+R` - Refresh page

## 🔄 Workflow Examples

### Daily Cash Entry Workflow
1. Open "Create Voucher" tab
2. Select voucher type (Receipt/Payment)
3. Enter date (auto-filled)
4. Add ledger entries
5. Click "Create Voucher"
6. Verify in Tally

### Month-End Bulk Processing
1. Prepare JSON file with all entries
2. Go to "Bulk Import" tab
3. Paste JSON data
4. Click "Process Bulk Vouchers"
5. Review results
6. Check Tally for entries

### Setting Up New Ledgers
1. Go to "Create Ledger" tab
2. Enter company name
3. Enter ledger name
4. Select parent group
5. Set opening balance (if any)
6. Click "Create Ledger"

## 📊 Sample Data Location

Sample vouchers: `sample-vouchers.json`

Use this as a template for bulk imports!

## 🆘 Need Help?

1. Check **SETUP.md** for detailed setup
2. Review **README.md** for full documentation
3. See **PROJECT_SUMMARY.md** for overview
4. Test with sample data first

## 🎯 Success Checklist

Before creating vouchers:
- [ ] Tally is running
- [ ] Company is open in Tally
- [ ] ODBC server is enabled (F12)
- [ ] Connection test shows green
- [ ] Ledgers exist in Tally
- [ ] Date format is correct (YYYYMMDD)

---

**Quick Help**: If stuck, test connection first, then verify Tally settings!

🚀 **Server**: http://localhost:3000
📊 **Tally API**: localhost:9000
