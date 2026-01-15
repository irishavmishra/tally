# Tally Automation - Setup Guide

## Step-by-Step Setup Instructions

### 1. Enable Tally API Server

**For Tally Prime:**
1. Open Tally Prime
2. Press `F12` (Configure)
3. Go to **Advanced Configuration**
4. Look for **TallyPrime Server** or **ODBC Server**
5. Set the following:
   - Enable: **Yes**
   - Port: **9000**
   - Accept connections from: **All IPs** (or specific IP if needed)
6. Press `Ctrl+A` to save
7. **Restart Tally** for changes to take effect

**For Tally ERP 9:**
1. Open Tally ERP 9
2. Press `F12` (Configure)
3. Go to **Advanced Configuration**
4. Enable **ODBC Server**
5. Set Port: **9000**
6. Save and restart Tally

### 2. Verify Tally is Ready

Before running the application, ensure:
- ✅ Tally is running
- ✅ A company is open/loaded
- ✅ ODBC/API server is enabled
- ✅ Port 9000 is accessible (not blocked by firewall)

### 3. Configure the Application

1. Open the `.env` file in the project root
2. Update the settings:

```env
TALLY_HOST=localhost          # Use 'localhost' if Tally is on same machine
TALLY_PORT=9000              # Default Tally API port
TALLY_COMPANY_NAME=ABC Ltd   # Your company name (exact match)
PORT=3000                    # Web application port
NODE_ENV=development
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Application

```bash
npm start
```

You should see:
```
🚀 Tally Automation Server running on http://localhost:3000
📊 Tally Host: localhost:9000
```

### 6. Open in Browser

Navigate to: **http://localhost:3000**

### 7. Test Connection

Click the **"Test Connection"** button in the application. You should see:
- ✅ Green dot indicator
- "Connected to Tally" message

## Common Issues & Solutions

### Issue: Connection Failed

**Symptoms:**
- Red dot indicator
- "Connection failed" message

**Solutions:**
1. Verify Tally is running
2. Check if a company is open in Tally
3. Confirm ODBC server is enabled (F12 → Advanced Configuration)
4. Try restarting Tally
5. Check Windows Firewall settings for port 9000

### Issue: Company Not Found

**Symptoms:**
- "Company not found" error when creating vouchers

**Solutions:**
1. Ensure company name in `.env` matches exactly (case-sensitive)
2. Make sure the company is currently open in Tally
3. Try using the full company name as it appears in Tally

### Issue: Ledger Not Found

**Symptoms:**
- "Ledger does not exist" error

**Solutions:**
1. Create the ledger in Tally first, OR
2. Use the "Create Ledger" tab in the application
3. Ensure ledger names are spelled exactly as in Tally (case-sensitive)

### Issue: Port Already in Use

**Symptoms:**
- "Port 3000 already in use" error

**Solutions:**
1. Change the PORT in `.env` file to another port (e.g., 3001)
2. Or stop the process using port 3000

## Testing the Application

### Test 1: Create a Simple Journal Entry

1. Go to "Create Voucher" tab
2. Fill in:
   - Company Name: Your company name
   - Voucher Type: Journal
   - Date: 20260115
   - Narration: Test Entry
3. Add 2 ledger entries:
   - Entry 1: Cash, 1000, Debit
   - Entry 2: Capital Account, 1000, Credit
4. Click "Create Voucher in Tally"
5. Check Tally for the new voucher

### Test 2: View Companies

1. Go to "View Data" tab
2. Click "Load Companies"
3. You should see XML data with your company list

### Test 3: Bulk Import

1. Go to "Bulk Import" tab
2. Copy the content from `sample-vouchers.json`
3. Paste into the JSON textarea
4. Click "Process Bulk Vouchers"
5. Check the results

## Next Steps

Once everything is working:

1. **Create Common Ledgers** - Use the "Create Ledger" tab to set up your chart of accounts
2. **Test Different Voucher Types** - Try Payment, Receipt, Sales, Purchase
3. **Automate Recurring Entries** - Use bulk import for monthly recurring entries
4. **Integrate with Other Systems** - Use the API endpoints to connect with your existing software

## API Integration Examples

### Using cURL

```bash
# Test connection
curl http://localhost:3000/api/tally/test-connection

# Create a voucher
curl -X POST http://localhost:3000/api/tally/create-voucher \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "ABC Ltd",
    "voucherType": "Journal",
    "date": "20260115",
    "narration": "Test",
    "ledgerEntries": [
      {"ledgerName": "Cash", "amount": 1000, "isDeemedPositive": "No"},
      {"ledgerName": "Capital Account", "amount": 1000, "isDeemedPositive": "Yes"}
    ]
  }'
```

### Using Python

```python
import requests

# Create a voucher
response = requests.post('http://localhost:3000/api/tally/create-voucher', json={
    'companyName': 'ABC Ltd',
    'voucherType': 'Journal',
    'date': '20260115',
    'narration': 'Automated entry from Python',
    'ledgerEntries': [
        {'ledgerName': 'Cash', 'amount': 1000, 'isDeemedPositive': 'No'},
        {'ledgerName': 'Capital Account', 'amount': 1000, 'isDeemedPositive': 'Yes'}
    ]
})

print(response.json())
```

## Support

If you encounter any issues not covered here, please:
1. Check the main README.md
2. Review Tally's ODBC documentation
3. Ensure all prerequisites are met

Happy Automating! 🚀
