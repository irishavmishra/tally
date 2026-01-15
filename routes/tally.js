const express = require('express');
const router = express.Router();
const TallyConnector = require('../utils/tallyConnector');

const tally = new TallyConnector(
    process.env.TALLY_HOST || 'localhost',
    process.env.TALLY_PORT || 9000
);

// Test Tally connection
router.get('/test-connection', async (req, res) => {
    try {
        const result = await tally.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get list of companies
router.get('/companies', async (req, res) => {
    try {
        const result = await tally.getCompanies();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get ledgers for a company
router.post('/ledgers', async (req, res) => {
    try {
        const { companyName } = req.body;
        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }
        const result = await tally.getLedgers(companyName);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a new ledger
router.post('/create-ledger', async (req, res) => {
    try {
        const { name, parent, openingBalance, companyName } = req.body;

        if (!name || !parent || !companyName) {
            return res.status(400).json({
                success: false,
                error: 'Name, parent, and company name are required'
            });
        }

        const result = await tally.createLedger({
            name,
            parent,
            openingBalance: openingBalance || 0,
            companyName
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a voucher
router.post('/create-voucher', async (req, res) => {
    try {
        const {
            voucherType,
            date,
            narration,
            ledgerEntries,
            companyName,
            voucherNumber
        } = req.body;

        if (!voucherType || !date || !ledgerEntries || !companyName) {
            return res.status(400).json({
                success: false,
                error: 'Voucher type, date, ledger entries, and company name are required'
            });
        }

        // Validate ledger entries
        if (!Array.isArray(ledgerEntries) || ledgerEntries.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 ledger entries are required for a voucher'
            });
        }

        const result = await tally.createVoucher({
            voucherType,
            date,
            narration: narration || '',
            ledgerEntries,
            companyName,
            voucherNumber
        });

        res.json({ success: true, data: result, message: 'Voucher created successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get vouchers for a date range
router.post('/vouchers', async (req, res) => {
    try {
        const { companyName, fromDate, toDate } = req.body;

        if (!companyName || !fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                error: 'Company name, from date, and to date are required'
            });
        }

        const result = await tally.getVouchers(companyName, fromDate, toDate);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bulk voucher creation
router.post('/bulk-vouchers', async (req, res) => {
    try {
        const { vouchers } = req.body;

        if (!Array.isArray(vouchers) || vouchers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Vouchers array is required'
            });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < vouchers.length; i++) {
            try {
                const result = await tally.createVoucher(vouchers[i]);
                results.push({ index: i, success: true, data: result });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            results,
            errors,
            summary: {
                total: vouchers.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
