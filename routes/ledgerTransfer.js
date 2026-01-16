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

/**
 * Get ledger entries (vouchers involving a specific ledger)
 */
router.post('/entries', async (req, res) => {
    try {
        const { companyName, ledgerName, fromDate, toDate } = req.body;

        if (!companyName || !ledgerName) {
            return res.status(400).json({
                success: false,
                error: 'Company name and ledger name are required'
            });
        }

        const from = fromDate || '20260101';
        const to = toDate || '20261231';

        const result = await tally.getLedgerEntries(companyName, ledgerName, from, to);

        // Parse the result to extract voucher entries
        let entries = [];
        if (result && result.ENVELOPE && result.ENVELOPE.BODY) {
            const body = result.ENVELOPE.BODY;
            if (body.DATA && body.DATA.COLLECTION) {
                const collection = body.DATA.COLLECTION;
                let vouchers = collection.VOUCHER;

                if (vouchers) {
                    // Ensure it's an array
                    if (!Array.isArray(vouchers)) {
                        vouchers = [vouchers];
                    }

                    entries = vouchers.map(v => {
                        // Parse ledger entries
                        let ledgerEntries = v['ALLLEDGERENTRIES.LIST'] || [];
                        if (!Array.isArray(ledgerEntries)) {
                            ledgerEntries = [ledgerEntries];
                        }

                        // Find the entry for this ledger
                        const targetEntry = ledgerEntries.find(le =>
                            le.LEDGERNAME && le.LEDGERNAME.toString().toLowerCase() === ledgerName.toLowerCase()
                        );

                        return {
                            masterID: v.MASTERID || v.$.REMOTEID || '',
                            guid: v.GUID || v.$.VCHKEY || '',
                            date: v.DATE || '',
                            voucherType: v.VOUCHERTYPENAME || '',
                            voucherNumber: v.VOUCHERNUMBER || '',
                            narration: v.NARRATION || '',
                            amount: targetEntry ? Math.abs(parseFloat(targetEntry.AMOUNT || 0)) : 0,
                            isDeemedPositive: targetEntry ? targetEntry.ISDEEMEDPOSITIVE : 'No',
                            allLedgerEntries: ledgerEntries.map(le => ({
                                ledgerName: le.LEDGERNAME || '',
                                amount: parseFloat(le.AMOUNT || 0),
                                isDeemedPositive: le.ISDEEMEDPOSITIVE || 'No'
                            }))
                        };
                    });
                }
            }
        }

        res.json({
            success: true,
            data: {
                ledgerName: ledgerName,
                fromDate: from,
                toDate: to,
                count: entries.length,
                entries: entries
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
 * Transfer selected entries - modify vouchers to change ledger
 */
router.post('/transfer-entries', async (req, res) => {
    try {
        const { companyName, fromLedger, toLedger, selectedEntries } = req.body;

        if (!companyName || !fromLedger || !toLedger || !Array.isArray(selectedEntries) || selectedEntries.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Company name, from ledger, to ledger, and selected entries are required'
            });
        }

        if (fromLedger === toLedger) {
            return res.status(400).json({
                success: false,
                error: 'From ledger and to ledger cannot be the same'
            });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < selectedEntries.length; i++) {
            const entry = selectedEntries[i];

            try {
                // Modify ledger entries - replace fromLedger with toLedger
                const modifiedLedgerEntries = entry.allLedgerEntries.map(le => ({
                    ledgerName: le.ledgerName.toLowerCase() === fromLedger.toLowerCase() ? toLedger : le.ledgerName,
                    amount: le.amount,
                    isDeemedPositive: le.isDeemedPositive
                }));

                const voucherData = {
                    masterID: entry.masterID,
                    guid: entry.guid,
                    voucherType: entry.voucherType,
                    date: entry.date,
                    narration: entry.narration,
                    voucherNumber: entry.voucherNumber,
                    ledgerEntries: modifiedLedgerEntries
                };

                const result = await tally.alterVoucher(companyName, voucherData);
                results.push({
                    index: i,
                    success: true,
                    voucherNumber: entry.voucherNumber,
                    date: entry.date,
                    data: result
                });
            } catch (error) {
                errors.push({
                    index: i,
                    success: false,
                    voucherNumber: entry.voucherNumber,
                    date: entry.date,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                fromLedger,
                toLedger,
                results: results,
                errors: errors,
                summary: {
                    total: selectedEntries.length,
                    successful: results.length,
                    failed: errors.length
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
