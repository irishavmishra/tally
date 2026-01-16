const http = require('http');
const xml2js = require('xml2js');

class TallyConnector {
  constructor(host = 'localhost', port = 9000) {
    this.host = host;
    this.port = port;
    this.parser = new xml2js.Parser({ explicitArray: false });
    this.builder = new xml2js.Builder({
      headless: false,
      renderOpts: { pretty: true, indent: '  ' }
    });
  }

  /**
   * Send XML request to Tally
   */
  async sendRequest(xmlData) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            this.parser.parseString(data, (err, result) => {
              if (err) {
                reject(new Error(`XML Parse Error: ${err.message}`));
              } else {
                resolve(result);
              }
            });
          } else {
            reject(new Error(`Tally responded with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`Connection Error: ${err.message}. Make sure Tally is running and ODBC/API is enabled.`));
      });

      req.write(xmlData);
      req.end();
    });
  }

  /**
   * Test connection to Tally
   */
  async testConnection() {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>CompanyList</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const result = await this.sendRequest(xml);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of companies
   */
  async getCompanies() {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>CompanyList</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Get list of ledgers
   */
  async getLedgers(companyName) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>LedgerList</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="LedgerList">
            <TYPE>Ledger</TYPE>
            <FETCH>Name, Parent, ClosingBalance</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Create a voucher (Journal, Payment, Receipt, Sales, Purchase)
   */
  async createVoucher(voucherData) {
    const {
      voucherType,
      date,
      narration,
      ledgerEntries,
      companyName,
      voucherNumber
    } = voucherData;

    // Build ledger entries XML
    let ledgerEntriesXML = '';
    ledgerEntries.forEach(entry => {
      ledgerEntriesXML += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDeemedPositive || 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
          <DATE>${date}</DATE>
          <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${voucherNumber || ''}</VOUCHERNUMBER>
          <NARRATION>${narration}</NARRATION>
          ${ledgerEntriesXML}
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Create a ledger
   */
  async createLedger(ledgerData) {
    const { name, parent, openingBalance, companyName } = ledgerData;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE>
        <LEDGER NAME="${name}" ACTION="Create">
          <NAME>${name}</NAME>
          <PARENT>${parent}</PARENT>
          <OPENINGBALANCE>${openingBalance || 0}</OPENINGBALANCE>
        </LEDGER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Get vouchers for a date range
   */
  async getVouchers(companyName, fromDate, toDate) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>VoucherList</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Get ledger entries (vouchers involving a specific ledger)
   */
  async getLedgerEntries(companyName, ledgerName, fromDate, toDate) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>LedgerVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="LedgerVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, NARRATION, MASTERID, GUID, ALLLEDGERENTRIES.LIST</FETCH>
            <FILTER>LedgerFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="LedgerFilter">$$FilterByLedger:$ALLLEDGERENTRIES.LIST:LEDGERNAME:"${ledgerName}"</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }

  /**
   * Alter/modify an existing voucher (change ledger name in entries)
   */
  async alterVoucher(companyName, voucherData) {
    const {
      masterID,
      guid,
      voucherType,
      date,
      narration,
      voucherNumber,
      ledgerEntries
    } = voucherData;

    // Build ledger entries XML
    let ledgerEntriesXML = '';
    ledgerEntries.forEach(entry => {
      ledgerEntriesXML += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDeemedPositive || 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER VCHTYPE="${voucherType}" ACTION="Alter" REMOTEID="${masterID}" VCHKEY="${guid}">
          <MASTERID>${masterID}</MASTERID>
          <DATE>${date}</DATE>
          <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${voucherNumber || ''}</VOUCHERNUMBER>
          <NARRATION>${narration || ''}</NARRATION>
          ${ledgerEntriesXML}
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;

    return await this.sendRequest(xml);
  }
}

module.exports = TallyConnector;
