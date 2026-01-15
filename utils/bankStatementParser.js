const XLSX = require('xlsx');
const Papa = require('papaparse');

class BankStatementParser {
    /**
     * Parse bank statement from various formats
     */
    static async parseFile(fileBuffer, fileType, bankType = 'generic') {
        try {
            let data;

            if (fileType === 'csv') {
                data = this.parseCSV(fileBuffer.toString());
            } else if (fileType === 'xlsx' || fileType === 'xls') {
                data = this.parseExcel(fileBuffer);
            } else if (fileType === 'json') {
                data = JSON.parse(fileBuffer.toString());
            } else {
                throw new Error('Unsupported file format');
            }

            // Normalize data based on bank type
            return this.normalizeData(data, bankType);
        } catch (error) {
            throw new Error(`Failed to parse bank statement: ${error.message}`);
        }
    }

    /**
     * Parse CSV file
     */
    static parseCSV(csvString) {
        const result = Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        if (result.errors.length > 0) {
            throw new Error(`CSV parsing error: ${result.errors[0].message}`);
        }

        return result.data;
    }

    /**
     * Parse Excel file
     */
    static parseExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    /**
     * Normalize data to standard format
     */
    static normalizeData(data, bankType) {
        const normalizer = this.getBankNormalizer(bankType);
        return data.map(row => normalizer(row)).filter(row => row !== null);
    }

    /**
     * Get normalizer function based on bank type
     */
    static getBankNormalizer(bankType) {
        const normalizers = {
            'hdfc': this.normalizeHDFC,
            'icici': this.normalizeICICI,
            'sbi': this.normalizeSBI,
            'axis': this.normalizeAxis,
            'generic': this.normalizeGeneric
        };

        return normalizers[bankType.toLowerCase()] || normalizers['generic'];
    }

    /**
     * Generic normalizer - works with most formats
     */
    static normalizeGeneric(row) {
        // Try to find date column
        const dateField = Object.keys(row).find(key =>
            key.toLowerCase().includes('date') ||
            key.toLowerCase().includes('txn') ||
            key.toLowerCase().includes('transaction')
        );

        // Try to find description column
        const descField = Object.keys(row).find(key =>
            key.toLowerCase().includes('desc') ||
            key.toLowerCase().includes('narration') ||
            key.toLowerCase().includes('particulars') ||
            key.toLowerCase().includes('remarks')
        );

        // Try to find debit column
        const debitField = Object.keys(row).find(key =>
            key.toLowerCase().includes('debit') ||
            key.toLowerCase().includes('withdrawal') ||
            key.toLowerCase().includes('dr')
        );

        // Try to find credit column
        const creditField = Object.keys(row).find(key =>
            key.toLowerCase().includes('credit') ||
            key.toLowerCase().includes('deposit') ||
            key.toLowerCase().includes('cr')
        );

        // Try to find balance column
        const balanceField = Object.keys(row).find(key =>
            key.toLowerCase().includes('balance')
        );

        if (!dateField) return null;

        const debit = parseFloat(row[debitField]) || 0;
        const credit = parseFloat(row[creditField]) || 0;

        // Skip if no transaction amount
        if (debit === 0 && credit === 0) return null;

        return {
            date: this.parseDate(row[dateField]),
            description: row[descField] || 'Bank Transaction',
            debit: debit,
            credit: credit,
            balance: parseFloat(row[balanceField]) || 0,
            transactionType: debit > 0 ? 'Payment' : 'Receipt',
            amount: debit > 0 ? debit : credit,
            rawData: row
        };
    }

    /**
     * HDFC Bank format normalizer
     */
    static normalizeHDFC(row) {
        return {
            date: this.parseDate(row['Date'] || row['Transaction Date']),
            description: row['Narration'] || row['Description'] || 'HDFC Transaction',
            debit: parseFloat(row['Withdrawal Amt.'] || row['Debit']) || 0,
            credit: parseFloat(row['Deposit Amt.'] || row['Credit']) || 0,
            balance: parseFloat(row['Balance']) || 0,
            chequeNo: row['Chq./Ref.No.'] || '',
            transactionType: (parseFloat(row['Withdrawal Amt.']) || 0) > 0 ? 'Payment' : 'Receipt',
            amount: Math.max(parseFloat(row['Withdrawal Amt.']) || 0, parseFloat(row['Deposit Amt.']) || 0),
            rawData: row
        };
    }

    /**
     * ICICI Bank format normalizer
     */
    static normalizeICICI(row) {
        return {
            date: this.parseDate(row['Transaction Date'] || row['Value Date']),
            description: row['Transaction Remarks'] || row['Description'] || 'ICICI Transaction',
            debit: parseFloat(row['Withdrawal Amount (INR )'] || row['Debit']) || 0,
            credit: parseFloat(row['Deposit Amount (INR )'] || row['Credit']) || 0,
            balance: parseFloat(row['Balance (INR )']) || 0,
            transactionType: (parseFloat(row['Withdrawal Amount (INR )']) || 0) > 0 ? 'Payment' : 'Receipt',
            amount: Math.max(parseFloat(row['Withdrawal Amount (INR )']) || 0, parseFloat(row['Deposit Amount (INR )']) || 0),
            rawData: row
        };
    }

    /**
     * SBI Bank format normalizer
     */
    static normalizeSBI(row) {
        return {
            date: this.parseDate(row['Txn Date'] || row['Transaction Date']),
            description: row['Description'] || row['Narration'] || 'SBI Transaction',
            debit: parseFloat(row['Debit']) || 0,
            credit: parseFloat(row['Credit']) || 0,
            balance: parseFloat(row['Balance']) || 0,
            transactionType: (parseFloat(row['Debit']) || 0) > 0 ? 'Payment' : 'Receipt',
            amount: Math.max(parseFloat(row['Debit']) || 0, parseFloat(row['Credit']) || 0),
            rawData: row
        };
    }

    /**
     * Axis Bank format normalizer
     */
    static normalizeAxis(row) {
        return {
            date: this.parseDate(row['Tran Date'] || row['Transaction Date']),
            description: row['Particulars'] || row['Description'] || 'Axis Transaction',
            debit: parseFloat(row['Dr Amount'] || row['Debit']) || 0,
            credit: parseFloat(row['Cr Amount'] || row['Credit']) || 0,
            balance: parseFloat(row['Balance']) || 0,
            chequeNo: row['Chq No'] || '',
            transactionType: (parseFloat(row['Dr Amount']) || 0) > 0 ? 'Payment' : 'Receipt',
            amount: Math.max(parseFloat(row['Dr Amount']) || 0, parseFloat(row['Cr Amount']) || 0),
            rawData: row
        };
    }

    /**
     * Parse date from various formats
     */
    static parseDate(dateStr) {
        if (!dateStr) return null;

        // If already in YYYYMMDD format
        if (/^\d{8}$/.test(dateStr.toString())) {
            return dateStr.toString();
        }

        // Try to parse date
        let date;

        // Handle DD/MM/YYYY or DD-MM-YYYY
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr)) {
            const parts = dateStr.split(/[\/\-]/);
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        // Handle YYYY-MM-DD
        else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(dateStr)) {
            date = new Date(dateStr);
        }
        // Handle other formats
        else {
            date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
            return null;
        }

        // Convert to YYYYMMDD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    }

    /**
     * Auto-categorize transactions based on description
     */
    static categorizTransaction(description) {
        const categories = {
            'Salary': ['salary', 'payroll', 'wages'],
            'Rent': ['rent', 'lease'],
            'Utilities': ['electricity', 'water', 'gas', 'utility'],
            'Telephone': ['mobile', 'phone', 'airtel', 'vodafone', 'jio'],
            'Internet': ['internet', 'broadband', 'wifi'],
            'Insurance': ['insurance', 'premium', 'lic'],
            'Bank Charges': ['charges', 'fee', 'sms', 'atm'],
            'Interest': ['interest', 'int.cr', 'int.dr'],
            'Cash Withdrawal': ['atm', 'cash', 'withdrawal'],
            'Transfer': ['transfer', 'neft', 'rtgs', 'imps', 'upi'],
            'Purchase': ['purchase', 'shopping', 'amazon', 'flipkart'],
            'Fuel': ['petrol', 'diesel', 'fuel', 'hp', 'iocl']
        };

        const descLower = description.toLowerCase();

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => descLower.includes(keyword))) {
                return category;
            }
        }

        return 'Miscellaneous';
    }

    /**
     * Convert bank transactions to Tally vouchers
     */
    static convertToVouchers(transactions, config) {
        const {
            companyName,
            bankLedgerName = 'Bank Account',
            defaultExpenseLedger = 'Miscellaneous Expenses',
            defaultIncomeLedger = 'Miscellaneous Income',
            autoCategorie = true
        } = config;

        return transactions.map(txn => {
            const isDebit = txn.debit > 0;
            const amount = txn.amount;

            // Auto-categorize if enabled
            let ledgerName = isDebit ? defaultExpenseLedger : defaultIncomeLedger;
            if (autoCategorie) {
                const category = this.categorizTransaction(txn.description);
                if (category !== 'Miscellaneous') {
                    ledgerName = category;
                }
            }

            return {
                voucherType: isDebit ? 'Payment' : 'Receipt',
                date: txn.date,
                narration: txn.description,
                companyName: companyName,
                ledgerEntries: [
                    {
                        ledgerName: isDebit ? ledgerName : bankLedgerName,
                        amount: amount,
                        isDeemedPositive: 'No'
                    },
                    {
                        ledgerName: isDebit ? bankLedgerName : ledgerName,
                        amount: amount,
                        isDeemedPositive: 'Yes'
                    }
                ],
                metadata: {
                    source: 'bank_statement',
                    category: autoCategorie ? this.categorizTransaction(txn.description) : null,
                    originalBalance: txn.balance
                }
            };
        });
    }
}

module.exports = BankStatementParser;
