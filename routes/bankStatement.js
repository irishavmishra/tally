const express = require('express');
const router = express.Router();
const multer = require('multer');
const BankStatementParser = require('../utils/bankStatementParser');
const TallyConnector = require('../utils/tallyConnector');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit for PDFs
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
            'application/pdf'
        ];

        if (allowedTypes.includes(file.mimetype) ||
            file.originalname.match(/\.(csv|xlsx|xls|json|pdf)$/)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, Excel, JSON and PDF files are allowed.'));
        }
    }
});

const tally = new TallyConnector(
    process.env.TALLY_HOST || 'localhost',
    process.env.TALLY_PORT || 9000
);

/**
 * Upload and parse bank statement
 */
router.post('/upload', upload.single('bankStatement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { bankType = 'generic' } = req.body;

        // Determine file type
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        // Parse the bank statement
        const transactions = await BankStatementParser.parseFile(
            req.file.buffer,
            fileExt,
            bankType
        );

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                transactionCount: transactions.length,
                transactions: transactions,
                summary: {
                    totalDebit: transactions.reduce((sum, t) => sum + t.debit, 0),
                    totalCredit: transactions.reduce((sum, t) => sum + t.credit, 0),
                    dateRange: {
                        from: transactions[0]?.date,
                        to: transactions[transactions.length - 1]?.date
                    }
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Parse and convert to vouchers (preview)
 */
router.post('/preview', upload.single('bankStatement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const {
            bankType = 'generic',
            companyName,
            bankLedgerName = 'Bank Account',
            defaultExpenseLedger = 'Miscellaneous Expenses',
            defaultIncomeLedger = 'Miscellaneous Income',
            autoCategorie = 'true'
        } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }

        // Determine file type
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        // Parse the bank statement
        const transactions = await BankStatementParser.parseFile(
            req.file.buffer,
            fileExt,
            bankType
        );

        // Convert to vouchers
        const vouchers = BankStatementParser.convertToVouchers(transactions, {
            companyName,
            bankLedgerName,
            defaultExpenseLedger,
            defaultIncomeLedger,
            autoCategorie: autoCategorie === 'true'
        });

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                transactionCount: transactions.length,
                voucherCount: vouchers.length,
                vouchers: vouchers,
                summary: {
                    payments: vouchers.filter(v => v.voucherType === 'Payment').length,
                    receipts: vouchers.filter(v => v.voucherType === 'Receipt').length,
                    totalAmount: vouchers.reduce((sum, v) => sum + v.ledgerEntries[0].amount, 0)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Import bank statement directly to Tally
 */
router.post('/import', upload.single('bankStatement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const {
            bankType = 'generic',
            companyName,
            bankLedgerName = 'Bank Account',
            defaultExpenseLedger = 'Miscellaneous Expenses',
            defaultIncomeLedger = 'Miscellaneous Income',
            autoCategorie = 'true'
        } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }

        // Determine file type
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        // Parse the bank statement
        const transactions = await BankStatementParser.parseFile(
            req.file.buffer,
            fileExt,
            bankType
        );

        // Convert to vouchers
        const vouchers = BankStatementParser.convertToVouchers(transactions, {
            companyName,
            bankLedgerName,
            defaultExpenseLedger,
            defaultIncomeLedger,
            autoCategorie: autoCategorie === 'true'
        });

        // Import to Tally
        const results = [];
        const errors = [];

        for (let i = 0; i < vouchers.length; i++) {
            try {
                const result = await tally.createVoucher(vouchers[i]);
                results.push({
                    index: i,
                    success: true,
                    voucher: vouchers[i],
                    data: result
                });
            } catch (error) {
                errors.push({
                    index: i,
                    success: false,
                    voucher: vouchers[i],
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                totalTransactions: transactions.length,
                results: results,
                errors: errors,
                summary: {
                    total: vouchers.length,
                    successful: results.length,
                    failed: errors.length,
                    successRate: ((results.length / vouchers.length) * 100).toFixed(2) + '%'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PDF Import with OCR support - All entries to Suspense ledger
 */
router.post('/pdf-import', upload.single('bankStatement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const {
            companyName,
            bankLedgerName = 'Bank Account',
            suspenseLedger = 'Suspense A/c'
        } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }

        // Determine file type
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        if (fileExt !== 'pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are allowed for this endpoint. Use /import for other formats.'
            });
        }

        // Parse the PDF bank statement
        const transactions = await BankStatementParser.parseFile(
            req.file.buffer,
            fileExt,
            'generic'
        );

        if (transactions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No transactions found in the PDF. Please check the file format.'
            });
        }

        // Convert to vouchers with Suspense ledger
        const vouchers = BankStatementParser.convertToSuspenseVouchers(transactions, {
            companyName,
            bankLedgerName,
            suspenseLedger
        });

        // Import to Tally
        const results = [];
        const errors = [];

        for (let i = 0; i < vouchers.length; i++) {
            try {
                const result = await tally.createVoucher(vouchers[i]);
                results.push({
                    index: i,
                    success: true,
                    voucher: vouchers[i],
                    data: result
                });
            } catch (error) {
                errors.push({
                    index: i,
                    success: false,
                    voucher: vouchers[i],
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                totalTransactions: transactions.length,
                suspenseLedger: suspenseLedger,
                results: results,
                errors: errors,
                summary: {
                    total: vouchers.length,
                    successful: results.length,
                    failed: errors.length,
                    payments: vouchers.filter(v => v.voucherType === 'Payment').length,
                    receipts: vouchers.filter(v => v.voucherType === 'Receipt').length,
                    successRate: vouchers.length > 0 ? ((results.length / vouchers.length) * 100).toFixed(2) + '%' : '0%'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PDF Preview - Show parsed transactions before import
 */
router.post('/pdf-preview', upload.single('bankStatement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        if (fileExt !== 'pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are allowed for this endpoint.'
            });
        }

        // Parse the PDF
        const transactions = await BankStatementParser.parseFile(
            req.file.buffer,
            fileExt,
            'generic'
        );

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                transactionCount: transactions.length,
                transactions: transactions,
                summary: {
                    totalDebit: transactions.reduce((sum, t) => sum + (t.debit || 0), 0),
                    totalCredit: transactions.reduce((sum, t) => sum + (t.credit || 0), 0),
                    payments: transactions.filter(t => t.debit > 0).length,
                    receipts: transactions.filter(t => t.credit > 0).length
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get supported bank formats
 */
router.get('/supported-banks', (req, res) => {
    res.json({
        success: true,
        data: {
            banks: [
                { code: 'hdfc', name: 'HDFC Bank', formats: ['CSV', 'Excel', 'PDF'] },
                { code: 'icici', name: 'ICICI Bank', formats: ['CSV', 'Excel', 'PDF'] },
                { code: 'sbi', name: 'State Bank of India', formats: ['CSV', 'Excel', 'PDF'] },
                { code: 'axis', name: 'Axis Bank', formats: ['CSV', 'Excel', 'PDF'] },
                { code: 'generic', name: 'Generic Format', formats: ['CSV', 'Excel', 'JSON', 'PDF'] }
            ],
            fileFormats: ['CSV', 'Excel (.xlsx, .xls)', 'JSON', 'PDF (with OCR)'],
            maxFileSize: '20MB'
        }
    });
});

module.exports = router;
