const XLSX = require('xlsx');
const Papa = require('papaparse');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

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
            } else if (fileType === 'pdf') {
                data = await this.parsePDF(fileBuffer);
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
     * Parse PDF file - tries text extraction first, then OCR if needed
     */
    static async parsePDF(buffer) {
        try {
            // First try direct text extraction
            const pdfData = await pdfParse(buffer);
            const text = pdfData.text;

            // Check if we got meaningful text
            if (text && text.trim().length > 100) {
                return this.parsePDFText(text);
            }

            // If no text, it's likely a scanned PDF - use OCR
            console.log('PDF has no extractable text, attempting OCR...');
            return await this.parsePDFWithOCR(buffer);
        } catch (error) {
            throw new Error(`PDF parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse extracted PDF text into transactions
     */
    static parsePDFText(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const transactions = [];

        // Common patterns for bank statement entries
        // Pattern: Date | Description | Debit | Credit | Balance
        const datePatterns = [
            /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,  // DD/MM/YYYY or DD-MM-YYYY
            /(\d{1,2}\s+\w{3}\s+\d{2,4})/          // DD Mon YYYY
        ];

        const amountPattern = /[\d,]+\.?\d*/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Try to find date in line
            let dateMatch = null;
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    dateMatch = match[1];
                    break;
                }
            }

            if (dateMatch) {
                // Extract amounts from the line
                const amounts = line.match(amountPattern) || [];
                const numericAmounts = amounts
                    .map(a => parseFloat(a.replace(/,/g, '')))
                    .filter(a => !isNaN(a) && a > 0);

                if (numericAmounts.length >= 1) {
                    // Get description - text between date and first amount
                    const dateIndex = line.indexOf(dateMatch);
                    const firstAmountMatch = line.match(/[\d,]+\.?\d*/);
                    let description = '';

                    if (firstAmountMatch) {
                        const amountIndex = line.indexOf(firstAmountMatch[0], dateIndex + dateMatch.length);
                        description = line.substring(dateIndex + dateMatch.length, amountIndex).trim();
                    }

                    // Determine if debit or credit based on position or keywords
                    const isDebit = line.toLowerCase().includes('dr') ||
                        line.toLowerCase().includes('debit') ||
                        line.toLowerCase().includes('withdrawal') ||
                        numericAmounts.length === 3; // Typically: Amount, Debit, Balance

                    const amount = numericAmounts[0];

                    transactions.push({
                        date: dateMatch,
                        description: description || 'Bank Transaction',
                        debit: isDebit ? amount : 0,
                        credit: isDebit ? 0 : amount,
                        amount: amount,
                        transactionType: isDebit ? 'Payment' : 'Receipt',
                        balance: numericAmounts[numericAmounts.length - 1] || 0,
                        rawData: { line }
                    });
                }
            }
        }

        return transactions;
    }

    /**
     * Parse scanned PDF using OCR
     */
    static async parsePDFWithOCR(buffer) {
        try {
            // For scanned PDFs, we'll use tesseract.js
            // This requires converting PDF pages to images first
            // For now, we'll return a message that OCR processing is needed

            console.log('OCR processing started...');

            // Since PDF to image conversion requires additional setup,
            // we'll try to use tesseract directly on the buffer
            // Note: In production, you'd want to use pdf2pic or similar

            const result = await Tesseract.recognize(buffer, 'eng', {
                logger: m => console.log(`OCR: ${m.status} - ${Math.round(m.progress * 100)}%`)
            });

            const text = result.data.text;

            if (text && text.trim().length > 50) {
                return this.parsePDFText(text);
            }

            throw new Error('OCR could not extract meaningful text from the PDF. Please ensure the PDF is clear and readable.');
        } catch (error) {
            throw new Error(`OCR failed: ${error.message}. Try uploading a clearer PDF or convert to CSV/Excel format.`);
        }
    }

    /**
     * Convert transactions to vouchers with Suspense ledger
     */
    static convertToSuspenseVouchers(transactions, config) {
        const {
            companyName,
            bankLedgerName = 'Bank Account',
            suspenseLedger = 'Suspense A/c'
        } = config;

        return transactions.map(txn => {
            const isDebit = txn.debit > 0;
            const amount = txn.amount || Math.max(txn.debit, txn.credit);

            return {
                voucherType: isDebit ? 'Payment' : 'Receipt',
                date: this.parseDate(txn.date) || txn.date,
                narration: txn.description,
                companyName: companyName,
                ledgerEntries: [
                    {
                        ledgerName: isDebit ? suspenseLedger : bankLedgerName,
                        amount: amount,
                        isDeemedPositive: 'No'
                    },
                    {
                        ledgerName: isDebit ? bankLedgerName : suspenseLedger,
                        amount: amount,
                        isDeemedPositive: 'Yes'
                    }
                ],
                metadata: {
                    source: 'pdf_bank_statement',
                    originalBalance: txn.balance
                }
            };
        });
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
