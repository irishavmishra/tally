// Global state
let ledgerEntryCount = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    testConnection();
    addLedgerEntry();
    addLedgerEntry();
    setTodayDate();
});

// Set today's date in YYYYMMDD format
function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    if (document.getElementById('voucherDate')) {
        document.getElementById('voucherDate').value = dateStr;
    }
    if (document.getElementById('transferDate')) {
        document.getElementById('transferDate').value = dateStr;
    }
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Add active class to clicked tab button
    event.target.classList.add('active');
}

// Test Tally connection
async function testConnection() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    statusText.textContent = 'Testing connection...';
    statusDot.className = 'status-dot';

    try {
        const response = await fetch('/api/tally/test-connection');
        const data = await response.json();

        if (data.success) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected to Tally';
            showAlert('Successfully connected to Tally!', 'success');
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Connection failed';
            showAlert(`Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Connection error';
        showAlert(`Error: ${error.message}. Make sure the server is running.`, 'error');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Add ledger entry
function addLedgerEntry() {
    ledgerEntryCount++;
    const container = document.getElementById('ledgerEntriesContainer');

    const entry = document.createElement('div');
    entry.className = 'ledger-entry';
    entry.id = `ledgerEntry${ledgerEntryCount}`;
    entry.innerHTML = `
    <div class="ledger-entry-header">
      <span class="ledger-entry-title">Entry #${ledgerEntryCount}</span>
      <button type="button" class="btn-remove" onclick="removeLedgerEntry(${ledgerEntryCount})">
        ❌ Remove
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ledger Name</label>
        <input type="text" class="form-input" name="ledgerName${ledgerEntryCount}" placeholder="e.g., Cash" required>
      </div>
      <div class="form-group">
        <label class="form-label">Amount</label>
        <input type="number" class="form-input" name="amount${ledgerEntryCount}" placeholder="0.00" step="0.01" required>
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" name="type${ledgerEntryCount}" required>
          <option value="No">Debit (Dr)</option>
          <option value="Yes">Credit (Cr)</option>
        </select>
      </div>
    </div>
  `;

    container.appendChild(entry);
}

// Remove ledger entry
function removeLedgerEntry(id) {
    const entry = document.getElementById(`ledgerEntry${id}`);
    if (entry) {
        entry.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => entry.remove(), 300);
    }
}

// Create voucher
async function createVoucher(event) {
    event.preventDefault();

    const companyName = document.getElementById('voucherCompany').value;
    const voucherType = document.getElementById('voucherType').value;
    const date = document.getElementById('voucherDate').value;
    const voucherNumber = document.getElementById('voucherNumber').value;
    const narration = document.getElementById('voucherNarration').value;

    // Collect ledger entries
    const ledgerEntries = [];
    const container = document.getElementById('ledgerEntriesContainer');
    const entries = container.querySelectorAll('.ledger-entry');

    entries.forEach((entry, index) => {
        const ledgerName = entry.querySelector(`input[name^="ledgerName"]`).value;
        const amount = parseFloat(entry.querySelector(`input[name^="amount"]`).value);
        const isDeemedPositive = entry.querySelector(`select[name^="type"]`).value;

        if (ledgerName && amount) {
            ledgerEntries.push({
                ledgerName,
                amount,
                isDeemedPositive
            });
        }
    });

    if (ledgerEntries.length < 2) {
        showAlert('At least 2 ledger entries are required!', 'error');
        return;
    }

    // Validate debit-credit balance
    let debitTotal = 0;
    let creditTotal = 0;
    ledgerEntries.forEach(entry => {
        if (entry.isDeemedPositive === 'No') {
            debitTotal += entry.amount;
        } else {
            creditTotal += entry.amount;
        }
    });

    if (Math.abs(debitTotal - creditTotal) > 0.01) {
        showAlert(`Voucher is not balanced! Debit: ${debitTotal.toFixed(2)}, Credit: ${creditTotal.toFixed(2)}`, 'error');
        return;
    }

    const voucherData = {
        companyName,
        voucherType,
        date,
        voucherNumber,
        narration,
        ledgerEntries
    };

    try {
        const response = await fetch('/api/tally/create-voucher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(voucherData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Voucher created successfully in Tally!', 'success');
            document.getElementById('voucherForm').reset();
            document.getElementById('ledgerEntriesContainer').innerHTML = '';
            ledgerEntryCount = 0;
            addLedgerEntry();
            addLedgerEntry();
            setTodayDate();
        } else {
            showAlert(`Failed to create voucher: ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Create ledger
async function createLedger(event) {
    event.preventDefault();

    const companyName = document.getElementById('ledgerCompany').value;
    const name = document.getElementById('ledgerName').value;
    const parent = document.getElementById('ledgerParent').value;
    const openingBalance = parseFloat(document.getElementById('ledgerBalance').value) || 0;

    const ledgerData = {
        companyName,
        name,
        parent,
        openingBalance
    };

    try {
        const response = await fetch('/api/tally/create-ledger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ledgerData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Ledger created successfully in Tally!', 'success');
            document.getElementById('ledgerForm').reset();
        } else {
            showAlert(`Failed to create ledger: ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Load companies
async function loadCompanies() {
    const container = document.getElementById('companiesList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch('/api/tally/companies');
        const data = await response.json();

        if (data.success) {
            container.innerHTML = '<pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; color: var(--text-secondary);">' +
                JSON.stringify(data.data, null, 2) +
                '</pre>';
        } else {
            container.innerHTML = `<p style="color: var(--error);">Error: ${data.error}</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
    }
}

// Load ledgers
async function loadLedgers() {
    const companyName = document.getElementById('viewLedgerCompany').value;

    if (!companyName) {
        showAlert('Please enter a company name', 'error');
        return;
    }

    const container = document.getElementById('ledgersList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch('/api/tally/ledgers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ companyName })
        });

        const data = await response.json();

        if (data.success) {
            container.innerHTML = '<pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; color: var(--text-secondary);">' +
                JSON.stringify(data.data, null, 2) +
                '</pre>';
        } else {
            container.innerHTML = `<p style="color: var(--error);">Error: ${data.error}</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
    }
}

// Process bulk vouchers
async function processBulkVouchers() {
    const jsonData = document.getElementById('bulkJson').value;

    if (!jsonData) {
        showAlert('Please paste JSON data or upload a file', 'error');
        return;
    }

    try {
        const vouchers = JSON.parse(jsonData);

        if (!Array.isArray(vouchers)) {
            showAlert('JSON data must be an array of vouchers', 'error');
            return;
        }

        const response = await fetch('/api/tally/bulk-vouchers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vouchers })
        });

        const data = await response.json();

        if (data.success) {
            const resultsContainer = document.getElementById('bulkResults');
            resultsContainer.innerHTML = `
        <div class="alert alert-success">
          <span>✅</span>
          <span>Processed ${data.summary.total} vouchers: ${data.summary.successful} successful, ${data.summary.failed} failed</span>
        </div>
        <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; color: var(--text-secondary); max-height: 400px;">${JSON.stringify(data, null, 2)}</pre>
      `;

            if (data.summary.successful > 0) {
                showAlert(`Successfully created ${data.summary.successful} vouchers!`, 'success');
            }
            if (data.summary.failed > 0) {
                showAlert(`${data.summary.failed} vouchers failed to create`, 'error');
            }
        } else {
            showAlert(`Bulk processing failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// File upload handler
document.getElementById('bulkFile')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;

            if (file.name.endsWith('.json')) {
                document.getElementById('bulkJson').value = content;
            } else if (file.name.endsWith('.csv')) {
                // Simple CSV to JSON conversion (you can enhance this)
                showAlert('CSV parsing not yet implemented. Please use JSON format.', 'error');
            }
        } catch (error) {
            showAlert(`Error reading file: ${error.message}`, 'error');
        }
    };

    reader.readAsText(file);
});

// Preview bank statement
async function previewBankStatement() {
    const file = document.getElementById('bankStatementFile').files[0];

    if (!file) {
        showAlert('Please select a bank statement file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('bankType', document.getElementById('bankType').value);
    formData.append('companyName', document.getElementById('bankCompany').value);
    formData.append('bankLedgerName', document.getElementById('bankLedgerName').value);
    formData.append('defaultExpenseLedger', document.getElementById('defaultExpenseLedger').value);
    formData.append('defaultIncomeLedger', document.getElementById('defaultIncomeLedger').value);
    formData.append('autoCategorie', document.getElementById('autoCategorie').value);

    const resultsContainer = document.getElementById('bankStatementResults');
    resultsContainer.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch('/api/bank-statement/preview', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const vouchers = data.data.vouchers;
            const summary = data.data.summary;

            let vouchersHTML = '';
            vouchers.slice(0, 10).forEach((voucher, index) => {
                vouchersHTML += `
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <strong style="color: var(--primary);">${voucher.voucherType} #${index + 1}</strong>
                            <span style="color: var(--text-secondary);">${voucher.date}</span>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">
                            ${voucher.narration}
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.875rem;">
                            <span>${voucher.ledgerEntries[0].ledgerName}: ₹${voucher.ledgerEntries[0].amount.toFixed(2)}</span>
                            <span>${voucher.ledgerEntries[1].ledgerName}: ₹${voucher.ledgerEntries[1].amount.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>✅</span>
                    <span>Preview: ${summary.payments} payments, ${summary.receipts} receipts | Total: ₹${summary.totalAmount.toFixed(2)}</span>
                </div>
                <h3 style="color: var(--primary); margin-bottom: 1rem;">Voucher Preview (showing first 10)</h3>
                ${vouchersHTML}
                ${vouchers.length > 10 ? `<p style="color: var(--text-muted); text-align: center;">... and ${vouchers.length - 10} more vouchers</p>` : ''}
            `;

            showAlert(`Preview generated: ${data.data.voucherCount} vouchers ready to import`, 'success');
        } else {
            resultsContainer.innerHTML = `
                <div class="alert alert-error">
                    <span>❌</span>
                    <span>Error: ${data.error}</span>
                </div>
            `;
            showAlert(`Preview failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Import bank statement to Tally
async function importBankStatement() {
    const file = document.getElementById('bankStatementFile').files[0];

    if (!file) {
        showAlert('Please select a bank statement file', 'error');
        return;
    }

    const companyName = document.getElementById('bankCompany').value;
    if (!companyName) {
        showAlert('Please enter company name', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to import this bank statement to Tally?\n\nThis will create vouchers in: ${companyName}`)) {
        return;
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('bankType', document.getElementById('bankType').value);
    formData.append('companyName', companyName);
    formData.append('bankLedgerName', document.getElementById('bankLedgerName').value);
    formData.append('defaultExpenseLedger', document.getElementById('defaultExpenseLedger').value);
    formData.append('defaultIncomeLedger', document.getElementById('defaultIncomeLedger').value);
    formData.append('autoCategorie', document.getElementById('autoCategorie').value);

    const resultsContainer = document.getElementById('bankStatementResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">Importing to Tally... This may take a few moments.</p>';

    try {
        const response = await fetch('/api/bank-statement/import', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>✅</span>
                    <span>Import Complete: ${summary.successful}/${summary.total} vouchers created (${summary.successRate} success rate)</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--success);">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Successful</div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--error);">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Failed</div>
                    </div>
                    <div style="background: rgba(0, 212, 255, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--primary);">${summary.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Total</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer; margin-bottom: 0.5rem;">View Errors (${data.data.errors.length})</summary>
                        <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; color: var(--text-secondary); max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully imported ${summary.successful} vouchers to Tally!`, 'success');

            // Reset form after successful import
            if (summary.failed === 0) {
                setTimeout(() => {
                    document.getElementById('bankStatementFile').value = '';
                }, 2000);
            }
        } else {
            resultsContainer.innerHTML = `
                <div class="alert alert-error">
                    <span>❌</span>
                    <span>Import Failed: ${data.error}</span>
                </div>
            `;
            showAlert(`Import failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Create single ledger transfer
async function createSingleTransfer(event) {
    event.preventDefault();

    const companyName = document.getElementById('transferCompany').value;
    const fromLedger = document.getElementById('fromLedger').value;
    const toLedger = document.getElementById('toLedger').value;
    const amount = document.getElementById('transferAmount').value;
    const date = document.getElementById('transferDate').value;
    const narration = document.getElementById('transferNarration').value || `Transfer from ${fromLedger} to ${toLedger}`;

    if (!companyName || !fromLedger || !toLedger || !amount || !date) {
        showAlert('All fields are required', 'error');
        return;
    }

    if (fromLedger === toLedger) {
        showAlert('From ledger and to ledger cannot be the same', 'error');
        return;
    }

    const resultsContainer = document.getElementById('transferResults');
    resultsContainer.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch('/api/ledger-transfer/create-transfer-entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                companyName,
                fromLedger,
                toLedger,
                amount: parseFloat(amount),
                date,
                narration
            })
        });

        const data = await response.json();

        if (data.success) {
            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>✅</span>
                    <span>Transfer entry created successfully!</span>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); margin-top: 1rem;">
                    <div style="margin-bottom: 0.5rem;"><strong style="color: var(--primary);">Journal Entry Created:</strong></div>
                    <div style="font-family: monospace; font-size: 0.875rem; color: var(--text-secondary);">
                        <div>Date: ${date}</div>
                        <div>Dr: ${toLedger} - ₹${parseFloat(amount).toFixed(2)}</div>
                        <div>Cr: ${fromLedger} - ₹${parseFloat(amount).toFixed(2)}</div>
                        <div>Narration: ${narration}</div>
                    </div>
                </div>
            `;
            showAlert('Transfer entry created successfully in Tally!', 'success');

            // Reset form
            document.getElementById('transferAmount').value = '';
            document.getElementById('transferNarration').value = '';
        } else {
            resultsContainer.innerHTML = `
                <div class="alert alert-error">
                    <span>❌</span>
                    <span>Error: ${data.error}</span>
                </div>
            `;
            showAlert(`Transfer failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Process bulk transfers
async function processBulkTransfers() {
    const jsonData = document.getElementById('bulkTransferJson').value;
    const companyName = document.getElementById('transferCompany').value;

    if (!companyName) {
        showAlert('Please enter company name first', 'error');
        return;
    }

    if (!jsonData) {
        showAlert('Please paste JSON data for bulk transfers', 'error');
        return;
    }

    let transfers;
    try {
        transfers = JSON.parse(jsonData);
        if (!Array.isArray(transfers)) {
            showAlert('JSON data must be an array of transfer objects', 'error');
            return;
        }
    } catch (e) {
        showAlert('Invalid JSON format', 'error');
        return;
    }

    const resultsContainer = document.getElementById('transferResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">Processing transfers... This may take a few moments.</p>';

    try {
        const response = await fetch('/api/ledger-transfer/bulk-transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                companyName,
                transfers
            })
        });

        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>✅</span>
                    <span>Bulk Transfer Complete: ${summary.successful}/${summary.total} entries created (${summary.successRate} success rate)</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--success);">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Successful</div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--error);">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Failed</div>
                    </div>
                    <div style="background: rgba(0, 212, 255, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 2rem; color: var(--primary);">${summary.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Total</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer; margin-bottom: 0.5rem;">View Errors (${data.data.errors.length})</summary>
                        <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; color: var(--text-secondary); max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully created ${summary.successful} transfer entries!`, 'success');

            if (summary.failed === 0) {
                document.getElementById('bulkTransferJson').value = '';
            }
        } else {
            resultsContainer.innerHTML = `
                <div class="alert alert-error">
                    <span>❌</span>
                    <span>Bulk Transfer Failed: ${data.error}</span>
                </div>
            `;
            showAlert(`Bulk transfer failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);
