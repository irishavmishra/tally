const express = require('express');
const router = express.Router();
const TallyConnector = require('../utils/tallyConnector');

const tally = new TallyConnector(
    process.env.TALLY_HOST || 'localhost',
    process.env.TALLY_PORT || 9000
);

/**
 * Transfer entries from one ledger to another
 */
router.post('/transfer', async (req, res) => {
    try {
        const {
            companyName,
            fromLedger,
            toLedger,
            dateRange,
            narrationFilter,
            amountFilter,
            transferAll = false
        } = req.body;

        if (!companyName || !fromLedger || !toLedger) {
            return res.status(400).json({
                success: false,
                error: 'Company name, from ledger, and to ledger are required'
            });
        }

        if (fromLedger === toLedger) {
            return res.status(400).json({
                success: false,
                error: 'From ledger and to ledger cannot be the same'
            });
        }

        // Get all vouchers for the date range
        const fromDate = dateRange?.from || '20260101';
        const toDate = dateRange?.to || '20261231';

        // For now, we'll create journal entries to transfer
        // In a real implementation, you'd fetch existing vouchers and modify them

        res.json({
            success: true,
            message: 'Ledger transfer feature - implementation in progress',
            data: {
                companyName,
                fromLedger,
                toLedger,
                dateRange: { from: fromDate, to: toDate },
                note: 'This will create journal entries to transfer balances'
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
 * Create journal entry for ledger transfer
 */
router.post('/create-transfer-entry', async (req, res) => {
    try {
        const {
            companyName,
            fromLedger,
            toLedger,
            amount,
            date,
            narration
        } = req.body;

        if (!companyName || !fromLedger || !toLedger || !amount || !date) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Create journal entry for transfer
        const voucherData = {
            voucherType: 'Journal',
            date: date,
            narration: narration || `Transfer from ${fromLedger} to ${toLedger}`,
            companyName: companyName,
            ledgerEntries: [
                {
                    ledgerName: toLedger,
                    amount: parseFloat(amount),
                    isDeemedPositive: 'No'
                },
                {
                    ledgerName: fromLedger,
                    amount: parseFloat(amount),
                    isDeemedPositive: 'Yes'
                }
            ]
        };

        const result = await tally.createVoucher(voucherData);

        res.json({
            success: true,
            message: 'Transfer entry created successfully',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Bulk transfer entries
 */
router.post('/bulk-transfer', async (req, res) => {
    try {
        const {
            companyName,
            transfers
        } = req.body;

        if (!companyName || !Array.isArray(transfers) || transfers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Company name and transfers array are required'
            });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < transfers.length; i++) {
            const transfer = transfers[i];

            try {
                const voucherData = {
                    voucherType: 'Journal',
                    date: transfer.date,
                    narration: transfer.narration || `Transfer from ${transfer.fromLedger} to ${transfer.toLedger}`,
                    companyName: companyName,
                    ledgerEntries: [
                        {
                            ledgerName: transfer.toLedger,
                            amount: parseFloat(transfer.amount),
                            isDeemedPositive: 'No'
                        },
                        {
                            ledgerName: transfer.fromLedger,
                            amount: parseFloat(transfer.amount),
                            isDeemedPositive: 'Yes'
                        }
                    ]
                };

                const result = await tally.createVoucher(voucherData);
                results.push({
                    index: i,
                    success: true,
                    transfer: transfer,
                    data: result
                });
            } catch (error) {
                errors.push({
                    index: i,
                    success: false,
                    transfer: transfer,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                results: results,
                errors: errors,
                summary: {
                    total: transfers.length,
                    successful: results.length,
                    failed: errors.length,
                    successRate: ((results.length / transfers.length) * 100).toFixed(2) + '%'
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

module.exports = router;
