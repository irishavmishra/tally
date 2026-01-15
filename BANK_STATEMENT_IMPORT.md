# 🏦 Bank Statement Import - Complete Guide

## Overview

The Bank Statement Import feature allows you to automatically import bank statements from various formats (CSV, Excel, JSON) and create vouchers in Tally. This eliminates manual data entry and saves hours of work.

## Supported Banks

The system includes pre-configured parsers for:

- **HDFC Bank** - CSV and Excel formats
- **ICICI Bank** - CSV and Excel formats
- **State Bank of India (SBI)** - CSV and Excel formats
- **Axis Bank** - CSV and Excel formats
- **Generic Format** - Works with most bank statement formats

## Supported File Formats

- **CSV** (.csv) - Comma-separated values
- **Excel** (.xlsx, .xls) - Microsoft Excel files
- **JSON** (.json) - JSON format

**Maximum file size:** 10MB

## How to Use

### Step 1: Download Bank Statement

1. Login to your bank's internet banking
2. Navigate to "Account Statement" or "Transaction History"
3. Select date range
4. Download in CSV or Excel format

### Step 2: Upload to Application

1. Open the application: http://localhost:3000
2. Click on "🏦 Bank Statement" tab
3. Fill in the required details:
   - **Company Name**: Your Tally company name (exact match)
   - **Bank Type**: Select your bank or "Generic Format"
   - **Bank Ledger Name**: Name of your bank ledger in Tally (e.g., "HDFC Bank")
   - **Default Expense Ledger**: Ledger for unclassified expenses
   - **Default Income Ledger**: Ledger for unclassified income
   - **Auto-Categorize**: Enable automatic transaction categorization

### Step 3: Preview Transactions

1. Click "Preview Transactions" button
2. Review how transactions will be categorized
3. Check voucher types (Payment/Receipt)
4. Verify ledger assignments

### Step 4: Import to Tally

1. Click "Import to Tally" button
2. Confirm the import
3. Wait for processing
4. Review import results

## Auto-Categorization

The system automatically categorizes transactions based on description keywords:

| Category | Keywords |
|----------|----------|
| **Salary** | salary, payroll, wages |
| **Rent** | rent, lease |
| **Utilities** | electricity, water, gas, utility |
| **Telephone** | mobile, phone, airtel, vodafone, jio |
| **Internet** | internet, broadband, wifi |
| **Insurance** | insurance, premium, lic |
| **Bank Charges** | charges, fee, sms, atm |
| **Interest** | interest, int.cr, int.dr |
| **Cash Withdrawal** | atm, cash, withdrawal |
| **Transfer** | transfer, neft, rtgs, imps, upi |
| **Purchase** | purchase, shopping, amazon, flipkart |
| **Fuel** | petrol, diesel, fuel, hp, iocl |

Transactions not matching any category are assigned to default ledgers.

## File Format Requirements

### Generic CSV Format

```csv
Date,Description,Debit,Credit,Balance
15/01/2026,Salary Credit,0,75000,125000
15/01/2026,Rent Payment,15000,0,110000
```

**Required columns:**
- Date (any common format)
- Description/Narration
- Debit/Withdrawal amount
- Credit/Deposit amount

**Optional columns:**
- Balance
- Cheque Number
- Reference Number

### HDFC Bank Format

Expected columns:
- Date / Transaction Date
- Narration / Description
- Withdrawal Amt. / Debit
- Deposit Amt. / Credit
- Balance
- Chq./Ref.No.

### ICICI Bank Format

Expected columns:
- Transaction Date / Value Date
- Transaction Remarks / Description
- Withdrawal Amount (INR) / Debit
- Deposit Amount (INR) / Credit
- Balance (INR)

### SBI Format

Expected columns:
- Txn Date / Transaction Date
- Description / Narration
- Debit
- Credit
- Balance

### Axis Bank Format

Expected columns:
- Tran Date / Transaction Date
- Particulars / Description
- Dr Amount / Debit
- Cr Amount / Credit
- Balance
- Chq No

## Date Formats Supported

The system automatically detects and converts these date formats:

- DD/MM/YYYY (e.g., 15/01/2026)
- DD-MM-YYYY (e.g., 15-01-2026)
- YYYY-MM-DD (e.g., 2026-01-15)
- MM/DD/YYYY (e.g., 01/15/2026)

All dates are converted to Tally's YYYYMMDD format.

## Voucher Creation Logic

### For Debit Transactions (Money Out)
- **Voucher Type**: Payment
- **Debit Entry**: Expense/Category Ledger
- **Credit Entry**: Bank Ledger

Example:
```
Payment Voucher
Date: 20260115
Narration: Rent Payment
Dr: Rent - ₹15,000
Cr: HDFC Bank - ₹15,000
```

### For Credit Transactions (Money In)
- **Voucher Type**: Receipt
- **Debit Entry**: Bank Ledger
- **Credit Entry**: Income/Category Ledger

Example:
```
Receipt Voucher
Date: 20260115
Narration: Salary Credit
Dr: HDFC Bank - ₹75,000
Cr: Salary - ₹75,000
```

## API Endpoints

### Preview Bank Statement
```
POST /api/bank-statement/preview
Content-Type: multipart/form-data

Parameters:
- bankStatement: File
- bankType: string (hdfc/icici/sbi/axis/generic)
- companyName: string
- bankLedgerName: string
- defaultExpenseLedger: string
- defaultIncomeLedger: string
- autoCategorie: boolean
```

### Import Bank Statement
```
POST /api/bank-statement/import
Content-Type: multipart/form-data

Parameters: (same as preview)
```

### Get Supported Banks
```
GET /api/bank-statement/supported-banks
```

## Sample Files

### Sample CSV File
See `sample-bank-statement.csv` for a working example.

### Sample JSON Format
```json
[
  {
    "date": "15/01/2026",
    "description": "Salary Credit",
    "debit": 0,
    "credit": 75000,
    "balance": 125000
  },
  {
    "date": "15/01/2026",
    "description": "Rent Payment",
    "debit": 15000,
    "credit": 0,
    "balance": 110000
  }
]
```

## Troubleshooting

### Issue: File not parsing correctly

**Solutions:**
1. Check if file format matches expected columns
2. Try "Generic Format" instead of specific bank
3. Ensure date format is recognizable
4. Remove any header rows or summary rows
5. Check for special characters in descriptions

### Issue: Transactions not categorized correctly

**Solutions:**
1. Disable auto-categorization
2. Manually specify default ledgers
3. Create required ledgers in Tally first
4. Review preview before importing

### Issue: Import fails for some transactions

**Solutions:**
1. Check if all ledgers exist in Tally
2. Verify company name is correct
3. Ensure Tally is running and connected
4. Review error details in import results

### Issue: Dates not recognized

**Solutions:**
1. Ensure date column is named "Date" or similar
2. Use standard date formats (DD/MM/YYYY)
3. Remove any text from date cells
4. Check for merged cells in Excel

## Best Practices

### 1. **Create Ledgers First**
Before importing, create all necessary ledgers in Tally:
- Bank ledger (e.g., "HDFC Bank")
- Common expense categories (Rent, Utilities, etc.)
- Common income categories (Salary, Interest, etc.)

### 2. **Preview Before Import**
Always preview transactions to:
- Verify categorization
- Check voucher types
- Ensure amounts are correct
- Identify any issues

### 3. **Import in Batches**
For large statements:
- Split into monthly batches
- Import one month at a time
- Verify each batch in Tally

### 4. **Clean Data**
Before uploading:
- Remove summary rows
- Remove extra header rows
- Ensure no merged cells
- Check for special characters

### 5. **Backup Tally**
Always take a Tally backup before bulk imports!

## Advanced Features

### Custom Categorization Rules

You can modify the categorization logic in:
`utils/bankStatementParser.js` → `categorizTransaction()` function

Add your own keywords:
```javascript
'Custom Category': ['keyword1', 'keyword2', 'keyword3']
```

### Custom Bank Format

To add support for a new bank:

1. Add bank option in HTML
2. Create normalizer function in `bankStatementParser.js`
3. Add to `getBankNormalizer()` mapping

## Performance

### Expected Processing Times

- **10 transactions**: < 5 seconds
- **100 transactions**: < 30 seconds
- **500 transactions**: < 2 minutes
- **1000 transactions**: < 5 minutes

Processing time depends on:
- Number of transactions
- Tally response time
- Network speed
- Server performance

## Security

- Files are processed in memory
- No files are stored on server
- Secure HTTPS communication
- No sensitive data logged

## Examples

### Example 1: Monthly Salary Account

```
1. Download statement from bank
2. Select bank type: HDFC
3. Bank ledger: "HDFC Salary Account"
4. Enable auto-categorization
5. Preview and verify
6. Import to Tally
```

### Example 2: Business Current Account

```
1. Download statement
2. Select bank type: ICICI
3. Bank ledger: "ICICI Current Account"
4. Default expense: "Business Expenses"
5. Default income: "Business Income"
6. Enable auto-categorization
7. Preview and adjust if needed
8. Import to Tally
```

## Support

For issues or questions:
1. Check this documentation
2. Review sample files
3. Test with small dataset first
4. Check Tally connection
5. Verify ledger names

## Updates & Enhancements

Future planned features:
- [ ] PDF statement parsing
- [ ] Bank-specific templates
- [ ] Custom categorization rules UI
- [ ] Duplicate detection
- [ ] Reconciliation features
- [ ] Multi-bank import
- [ ] Scheduled imports

---

**Happy Importing! 🚀**

Automate your bank reconciliation and save hours of manual work!
