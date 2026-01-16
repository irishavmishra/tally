// Global state
let ledgerEntryCount = 0;
let cachedLedgers = [];
let lastFetchedCompany = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    testConnection();
    addLedgerEntry();
    addLedgerEntry();
    setTodayDate();
    setupCompanyInputListeners();
});

// Setup listeners on all company input fields to fetch ledgers
function setupCompanyInputListeners() {
    const companyInputs = [
        'voucherCompany',
        'ledgerCompany',
        'transferCompany',
        'bankCompany',
        'viewLedgerCompany'
    ];

    companyInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('blur', () => fetchLedgersForDropdown(input.value));
            input.addEventListener('change', () => fetchLedgersForDropdown(input.value));
        }
    });
}

// Fetch ledgers from Tally and populate dropdown
async function fetchLedgersForDropdown(companyName) {
    if (!companyName || companyName === lastFetchedCompany) {
        return;
    }

    lastFetchedCompany = companyName;

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
            // Parse ledgers from response
            let ledgers = [];
            if (data.data && data.data.ENVELOPE && data.data.ENVELOPE.BODY) {
                const body = data.data.ENVELOPE.BODY;
                if (body.DATA && body.DATA.COLLECTION) {
                    let ledgerList = body.DATA.COLLECTION.LEDGER;
                    if (ledgerList) {
                        if (!Array.isArray(ledgerList)) {
                            ledgerList = [ledgerList];
                        }
                        ledgers = ledgerList.map(l => l.NAME || l.$.NAME || l);
                    }
                }
            }

            cachedLedgers = ledgers;

            // Populate datalist
            const datalist = document.getElementById('ledgersList');
            datalist.innerHTML = ledgers.map(name => `<option value="${name}">`).join('');

            showAlert(`Loaded ${ledgers.length} ledgers from "${companyName}"`, 'success');
        }
    } catch (error) {
        console.error('Failed to fetch ledgers:', error);
    }
}

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
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Add active class to clicked tab button (handling if event is passed)
    if (event && event.target) {
        event.target.classList.add('active');
    }
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
            statusText.textContent = 'Connected';
            showAlert('Successfully connected to Tally', 'success');
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Connection failed';
            showAlert(`Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Connection error';
        showAlert(`Error: ${error.message}. Is the server running?`, 'error');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    // types: success, error, info
    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';

    alert.innerHTML = `
    <span style="font-weight:bold">${icon}</span>
    <span>${message}</span>
  `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        alert.style.transition = 'all 0.3s ease';
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
      <span class="ledger-entry-title">Entry ${ledgerEntryCount}</span>
      <button type="button" class="btn-remove" onclick="removeLedgerEntry(${ledgerEntryCount})">
        Remove
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ledger Name</label>
        <input type="text" class="form-input" name="ledgerName${ledgerEntryCount}" placeholder="e.g., Cash" list="ledgersList" required>
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
        entry.style.transition = 'all 0.3s ease';
        entry.style.opacity = '0';
        entry.style.transform = 'translateX(20px)';
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
        showAlert('At least 2 ledger entries are required', 'error');
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
        showAlert(`Unbalanced voucher! Dr: ${debitTotal.toFixed(2)}, Cr: ${creditTotal.toFixed(2)}`, 'error');
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
            showAlert('Voucher created successfully in Tally', 'success');
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
            showAlert('Ledger created successfully in Tally', 'success');
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
            container.innerHTML = `<pre class="code-block">${JSON.stringify(data.data, null, 2)}</pre>`;
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
            container.innerHTML = `<pre class="code-block">${JSON.stringify(data.data, null, 2)}</pre>`;
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
          <span>Processed ${data.summary.total} vouchers: ${data.summary.successful} successful, ${data.summary.failed} failed</span>
        </div>
        <pre class="code-block" style="max-height: 400px;">${JSON.stringify(data, null, 2)}</pre>
      `;

            if (data.summary.successful > 0) {
                showAlert(`Successfully created ${data.summary.successful} vouchers`, 'success');
            }
            if (data.summary.failed > 0) {
                showAlert(`${data.summary.failed} vouchers failed`, 'error');
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
                    <div style="background: var(--bg-primary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <strong style="color: var(--primary);">${voucher.voucherType} #${index + 1}</strong>
                            <span style="color: var(--text-secondary);">${voucher.date}</span>
                        </div>
                        <div style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                            ${voucher.narration}
                        </div>
                        <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
                            <span>${voucher.ledgerEntries[0].ledgerName}: ₹${voucher.ledgerEntries[0].amount.toFixed(2)}</span>
                            <span>${voucher.ledgerEntries[1].ledgerName}: ₹${voucher.ledgerEntries[1].amount.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>Preview: ${summary.payments} payments, ${summary.receipts} receipts | Total: ₹${summary.totalAmount.toFixed(2)}</span>
                </div>
                <h3 style="font-size: 1rem; margin-bottom: 1rem;">Voucher Preview (first 10)</h3>
                ${vouchersHTML}
                ${vouchers.length > 10 ? `<p class="text-muted" style="text-align: center; margin-top:1rem;">... and ${vouchers.length - 10} more vouchers</p>` : ''}
            `;

            showAlert(`Preview generated: ${data.data.voucherCount} vouchers ready to import`, 'success');
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Error: ${data.error}</span></div>`;
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

    if (!confirm(`Are you sure you want to import this bank statement to Tally?\n\nTarget Company: ${companyName}`)) {
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
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">Importing to Tally...</p>';

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
                    <span>Import Complete: ${summary.successful}/${summary.total} vouchers created</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--success); font-weight: 600;">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Successful</div>
                    </div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--error); font-weight: 600;">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Failed</div>
                    </div>
                    <div style="background: rgba(0, 113, 227, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--primary); font-weight: 600;">${summary.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Total</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer; margin-bottom: 0.5rem;">View Errors (${data.data.errors.length})</summary>
                        <pre class="code-block" style="max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully imported ${summary.successful} vouchers`, 'success');

            if (summary.failed === 0) {
                setTimeout(() => {
                    document.getElementById('bankStatementFile').value = '';
                }, 2000);
            }
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Import Failed: ${data.error}</span></div>`;
            showAlert(`Import failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Preview PDF Bank Statement with OCR
async function previewPDFStatement() {
    const file = document.getElementById('pdfBankStatementFile').files[0];

    if (!file) {
        showAlert('Please select a PDF file', 'error');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showAlert('Only PDF files are allowed', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('bankStatement', file);

    const resultsContainer = document.getElementById('bankStatementResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">PDF parse ho raha hai... OCR me time lag sakta hai</p>';

    try {
        const response = await fetch('/api/bank-statement/pdf-preview', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const txns = data.data.transactions;
            const summary = data.data.summary;

            let txnHTML = '';
            txns.slice(0, 15).forEach((txn, index) => {
                txnHTML += `
                    <div style="background: var(--bg-primary); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                            <span style="font-weight: 500; color: ${txn.debit > 0 ? 'var(--error)' : 'var(--success)'};">${txn.transactionType}</span>
                            <span style="color: var(--text-secondary); font-size: 0.85rem;">${txn.date}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">${txn.description}</div>
                        <div style="font-weight: 600; text-align: right;">₹${txn.amount.toFixed(2)}</div>
                    </div>
                `;
            });

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>PDF parsed: ${data.data.transactionCount} transactions found</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--error); font-weight: 600;">${summary.payments}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Payments (Dr)</div>
                    </div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--success); font-weight: 600;">${summary.receipts}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Receipts (Cr)</div>
                    </div>
                </div>
                <h4 style="margin: 1rem 0 0.5rem;">Transactions Preview (first 15):</h4>
                ${txnHTML}
                ${txns.length > 15 ? `<p class="text-muted" style="text-align: center;">... and ${txns.length - 15} more</p>` : ''}
            `;

            showAlert(`PDF parsed: ${txns.length} transactions found`, 'success');
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Error: ${data.error}</span></div>`;
            showAlert(`PDF parsing failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Import PDF Bank Statement to Tally (Suspense Ledger)
async function importPDFStatement() {
    const file = document.getElementById('pdfBankStatementFile').files[0];
    const companyName = document.getElementById('bankCompany').value;
    const bankLedgerName = document.getElementById('bankLedgerName').value;
    const suspenseLedger = document.getElementById('suspenseLedger').value;

    if (!file) {
        showAlert('Please select a PDF file', 'error');
        return;
    }

    if (!companyName) {
        showAlert('Please enter company name', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to import PDF bank statement to Tally?\n\nCompany: ${companyName}\nAll entries will go to: ${suspenseLedger}`)) {
        return;
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('companyName', companyName);
    formData.append('bankLedgerName', bankLedgerName);
    formData.append('suspenseLedger', suspenseLedger);

    const resultsContainer = document.getElementById('bankStatementResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">PDF import ho raha hai Tally me...</p>';

    try {
        const response = await fetch('/api/bank-statement/pdf-import', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>PDF Import Complete: ${summary.successful}/${summary.total} vouchers created → ${data.data.suspenseLedger}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--success); font-weight: 600;">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Successful</div>
                    </div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--error); font-weight: 600;">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Failed</div>
                    </div>
                    <div style="background: rgba(255, 149, 0, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--warning); font-weight: 600;">${summary.payments}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Payments</div>
                    </div>
                    <div style="background: rgba(0, 113, 227, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.25rem; color: var(--primary); font-weight: 600;">${summary.receipts}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Receipts</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer;">View Errors (${data.data.errors.length})</summary>
                        <pre class="code-block" style="max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully imported ${summary.successful} entries to ${suspenseLedger}`, 'success');
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Import Failed: ${data.error}</span></div>`;
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
        showAlert('Source and destination ledgers must be different', 'error');
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
                    <span>Transfer entry created successfully</span>
                </div>
                <div style="background: var(--bg-primary); padding: 1rem; border-radius: var(--radius-sm); margin-top: 1rem; border: 1px solid var(--border-color);">
                    <div style="margin-bottom: 0.5rem;"><strong style="color: var(--primary);">Journal Entry Details</strong></div>
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85rem; color: var(--text-secondary);">
                        <div>Date: ${date}</div>
                        <div>Dr: ${toLedger} - ₹${parseFloat(amount).toFixed(2)}</div>
                        <div>Cr: ${fromLedger} - ₹${parseFloat(amount).toFixed(2)}</div>
                        <div>Narration: ${narration}</div>
                    </div>
                </div>
            `;
            showAlert('Transfer entry created successfully', 'success');

            // Reset form
            document.getElementById('transferAmount').value = '';
            document.getElementById('transferNarration').value = '';
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Error: ${data.error}</span></div>`;
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
            showAlert('JSON data must be an array', 'error');
            return;
        }
    } catch (e) {
        showAlert('Invalid JSON format', 'error');
        return;
    }

    const resultsContainer = document.getElementById('transferResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">Processing transfers...</p>';

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
                    <span>Bulk Transfer Complete: ${summary.successful}/${summary.total} entries created</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--success); font-weight: 600;">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Successful</div>
                    </div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--error); font-weight: 600;">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Failed</div>
                    </div>
                    <div style="background: rgba(0, 113, 227, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--primary); font-weight: 600;">${summary.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Total</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer; margin-bottom: 0.5rem;">View Errors (${data.data.errors.length})</summary>
                        <pre class="code-block" style="max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully created ${summary.successful} transfer entries`, 'success');

            if (summary.failed === 0) {
                document.getElementById('bulkTransferJson').value = '';
            }
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Bulk Transfer Failed: ${data.error}</span></div>`;
            showAlert(`Bulk transfer failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Global state for ledger entries
let loadedEntries = [];

// Load ledger entries for entry-based transfer
async function loadLedgerEntries() {
    const companyName = document.getElementById('transferCompany').value;
    const ledgerName = document.getElementById('sourceLedger').value;
    const fromDate = document.getElementById('entryFromDate').value || '20260101';
    const toDate = document.getElementById('entryToDate').value || '20261231';

    if (!companyName) {
        showAlert('Please enter company name first', 'error');
        return;
    }

    if (!ledgerName) {
        showAlert('Please enter source ledger name', 'error');
        return;
    }

    const tableContainer = document.getElementById('entriesTableContainer');
    const entriesTable = document.getElementById('entriesTable');
    const transferTarget = document.getElementById('transferTargetContainer');

    entriesTable.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';
    tableContainer.style.display = 'block';
    transferTarget.style.display = 'none';

    try {
        const response = await fetch('/api/ledger-transfer/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                companyName,
                ledgerName,
                fromDate,
                toDate
            })
        });

        const data = await response.json();

        if (data.success) {
            loadedEntries = data.data.entries;

            if (loadedEntries.length === 0) {
                entriesTable.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                        No entries found for "${ledgerName}" in the given date range.
                    </div>
                `;
                return;
            }

            let tableHTML = '';
            loadedEntries.forEach((entry, index) => {
                tableHTML += `
                    <div class="entry-row" style="display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 1rem;" data-index="${index}">
                        <input type="checkbox" class="entry-checkbox" data-index="${index}" onchange="updateSelectedCount()">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span style="font-weight: 500; color: var(--primary);">${entry.voucherType}</span>
                                <span style="color: var(--text-secondary); font-size: 0.85rem;">${entry.date}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${entry.narration || 'No narration'}
                            </div>
                        </div>
                        <div style="text-align: right; min-width: 100px;">
                            <div style="font-weight: 600; color: ${entry.isDeemedPositive === 'Yes' ? 'var(--success)' : 'var(--error)'};">
                                ₹${entry.amount.toFixed(2)}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                ${entry.isDeemedPositive === 'Yes' ? 'Cr' : 'Dr'}
                            </div>
                        </div>
                    </div>
                `;
            });

            entriesTable.innerHTML = tableHTML;
            transferTarget.style.display = 'block';
            document.getElementById('selectAllEntries').checked = false;
            updateSelectedCount();

            showAlert(`Loaded ${loadedEntries.length} entries for "${ledgerName}"`, 'success');
        } else {
            entriesTable.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error: ${data.error}</div>`;
            showAlert(`Failed to load entries: ${data.error}`, 'error');
        }
    } catch (error) {
        entriesTable.innerHTML = '';
        tableContainer.style.display = 'none';
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Update selected count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.entry-checkbox:checked');
    document.getElementById('selectedCount').textContent = `${checkboxes.length} selected`;
}

// Toggle select all entries
function toggleSelectAllEntries() {
    const selectAll = document.getElementById('selectAllEntries').checked;
    const checkboxes = document.querySelectorAll('.entry-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll);
    updateSelectedCount();
}

// Transfer selected entries
async function transferSelectedEntries() {
    const companyName = document.getElementById('transferCompany').value;
    const fromLedger = document.getElementById('sourceLedger').value;
    const toLedger = document.getElementById('targetLedger').value;

    if (!companyName || !fromLedger || !toLedger) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    if (fromLedger.toLowerCase() === toLedger.toLowerCase()) {
        showAlert('Source and target ledger cannot be the same', 'error');
        return;
    }

    // Get selected entries
    const checkboxes = document.querySelectorAll('.entry-checkbox:checked');
    if (checkboxes.length === 0) {
        showAlert('Please select at least one entry to transfer', 'error');
        return;
    }

    const selectedEntries = Array.from(checkboxes).map(cb => {
        const index = parseInt(cb.dataset.index);
        return loadedEntries[index];
    });

    if (!confirm(`Are you sure you want to transfer ${selectedEntries.length} entries from "${fromLedger}" to "${toLedger}"?\n\nThis will modify the original vouchers in Tally.`)) {
        return;
    }

    const resultsContainer = document.getElementById('transferResults');
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">Transferring entries...</p>';

    try {
        const response = await fetch('/api/ledger-transfer/transfer-entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                companyName,
                fromLedger,
                toLedger,
                selectedEntries
            })
        });

        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;

            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <span>Transfer Complete: ${summary.successful}/${summary.total} entries modified</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--success); font-weight: 600;">${summary.successful}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Successful</div>
                    </div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--error); font-weight: 600;">${summary.failed}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Failed</div>
                    </div>
                    <div style="background: rgba(0, 113, 227, 0.1); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 1.5rem; color: var(--primary); font-weight: 600;">${summary.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Total</div>
                    </div>
                </div>
                ${data.data.errors.length > 0 ? `
                    <details style="margin-top: 1rem;">
                        <summary style="color: var(--error); cursor: pointer; margin-bottom: 0.5rem;">View Errors (${data.data.errors.length})</summary>
                        <pre class="code-block" style="max-height: 300px;">${JSON.stringify(data.data.errors, null, 2)}</pre>
                    </details>
                ` : ''}
            `;

            showAlert(`Successfully transferred ${summary.successful} entries`, 'success');

            // Reload entries to reflect changes
            if (summary.successful > 0) {
                setTimeout(() => {
                    loadLedgerEntries();
                }, 1500);
            }
        } else {
            resultsContainer.innerHTML = `<div class="alert alert-error"><span>Transfer Failed: ${data.error}</span></div>`;
            showAlert(`Transfer failed: ${data.error}`, 'error');
        }
    } catch (error) {
        resultsContainer.innerHTML = '';
        showAlert(`Error: ${error.message}`, 'error');
    }
}
