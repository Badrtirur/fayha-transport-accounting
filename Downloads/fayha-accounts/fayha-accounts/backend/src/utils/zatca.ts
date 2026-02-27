// ==========================================
// ZATCA Phase 1 — UUID, TLV QR, SHA-256 Hash
// Phase 2 — Real Sandbox API Integration
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { createHash, createSign, generateKeyPairSync, createPrivateKey } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ZATCA_API_URL = process.env.ZATCA_API_URL || 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';

// ==========================================
// Phase 1 — UUID, TLV QR, SHA-256 Hash
// ==========================================

export function generateZatcaUuid(): string {
  return uuidv4();
}

export function buildTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatAmount: number,
): string {
  const entries = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: timestamp },
    { tag: 4, value: totalWithVat.toFixed(2) },
    { tag: 5, value: vatAmount.toFixed(2) },
  ];

  const parts: Buffer[] = [];
  for (const entry of entries) {
    const valueBytes = Buffer.from(entry.value, 'utf-8');
    const tlv = Buffer.alloc(2 + valueBytes.length);
    tlv[0] = entry.tag;
    tlv[1] = valueBytes.length;
    valueBytes.copy(tlv, 2);
    parts.push(tlv);
  }

  return Buffer.concat(parts).toString('base64');
}

export function computeInvoiceHash(invoiceData: {
  invoiceNumber: string;
  issueDate: string | Date;
  totalAmount: number;
  vatAmount: number;
  sellerName: string;
  vatNumber: string;
}): string {
  const canonical = [
    invoiceData.invoiceNumber,
    invoiceData.issueDate instanceof Date
      ? invoiceData.issueDate.toISOString()
      : invoiceData.issueDate,
    invoiceData.totalAmount.toFixed(2),
    invoiceData.vatAmount.toFixed(2),
    invoiceData.sellerName,
    invoiceData.vatNumber,
  ].join('|');

  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

export function generateZatcaFields(
  invoiceData: {
    invoiceNumber: string;
    issueDate: string | Date;
    totalAmount: number;
    vatAmount: number;
  },
  companyConfig: {
    sellerName: string;
    vatNumber: string;
  },
): {
  zatcaUuid: string;
  zatcaHash: string;
  zatcaQrCode: string;
  zatcaStatus: string;
} {
  const zatcaUuid = generateZatcaUuid();

  const timestamp =
    invoiceData.issueDate instanceof Date
      ? invoiceData.issueDate.toISOString()
      : new Date(invoiceData.issueDate).toISOString();

  const zatcaQrCode = buildTlvBase64(
    companyConfig.sellerName,
    companyConfig.vatNumber,
    timestamp,
    invoiceData.totalAmount,
    invoiceData.vatAmount,
  );

  const zatcaHash = computeInvoiceHash({
    invoiceNumber: invoiceData.invoiceNumber,
    issueDate: invoiceData.issueDate,
    totalAmount: invoiceData.totalAmount,
    vatAmount: invoiceData.vatAmount,
    sellerName: companyConfig.sellerName,
    vatNumber: companyConfig.vatNumber,
  });

  return {
    zatcaUuid,
    zatcaHash,
    zatcaQrCode,
    zatcaStatus: 'Due',
  };
}

// ==========================================
// Phase 2 — Real ZATCA Sandbox API
// ==========================================

export interface ZatcaCsrConfig {
  commonName: string;        // Taxpayer-provided ID (free text)
  organizationUnit: string;  // Branch name
  organization: string;      // Taxpayer name
  country: string;           // "SA"
  vatNumber: string;         // 15-digit VAT (starts and ends with 3)
  egsSerialNumber: string;   // Format: 1-SolutionName|2-Model|3-UUID
  location: string;          // Branch address
  industry: string;          // Branch industry sector
  invoiceType: string;       // "1100" = standard+simplified
  production: boolean;       // false = sandbox (TSTZATCA), true = production (ZATCA)
}

/**
 * Helper: run an OpenSSL command and return stdout.
 */
function runOpenSSL(args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn('openssl', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      if (code !== 0 && !stdout.includes('-----BEGIN')) {
        return reject(new Error(`OpenSSL exited with code ${code}: ${stderr}`));
      }
      resolve(stdout);
    });
    proc.on('error', (err) => reject(new Error(`OpenSSL not found. Install OpenSSL and add it to PATH. ${err.message}`)));
  });
}

/**
 * Build the OpenSSL CSR config file content per ZATCA specification.
 * Reference: ZATCA CSR Configuration document + SDK csr_template.
 */
function buildCsrConfig(config: ZatcaCsrConfig): string {
  const templateName = config.production ? 'ZATCA-Code-Signing' : 'TSTZATCA-Code-Signing';

  return `# ZATCA CSR Configuration
[req]
prompt = no
utf8 = no
distinguished_name = req_dn
req_extensions = v3_req

[ v3_req ]
1.3.6.1.4.1.311.20.2 = ASN1:UTF8String:${templateName}
subjectAltName = dirName:dir_sect

[ dir_sect ]
# EGS Serial number (1-SolutionName|2-Model|3-SerialNumber)
SN = ${config.egsSerialNumber}
# VAT Registration number
UID = ${config.vatNumber}
# Invoice type (TSCZ)(1=supported, 0=not supported)
title = ${config.invoiceType}
# Location (branch address)
registeredAddress = ${config.location}
# Industry
businessCategory = ${config.industry}

[ req_dn ]
CN = ${config.commonName}
OU = ${config.organizationUnit}
O = ${config.organization}
C = ${config.country}
`;
}

/**
 * Generate EC secp256k1 keypair and a proper ZATCA-compliant CSR using OpenSSL.
 * Returns { privateKey (PEM), csrPem (PEM string), csrBase64 (base64 of PEM) }.
 */
export async function generateZatcaCsr(config: ZatcaCsrConfig): Promise<{
  privateKey: string;
  csrPem: string;
  csrBase64: string;
}> {
  const tmpDir = os.tmpdir();
  const uid = uuidv4();
  const keyFile = path.join(tmpDir, `zatca_key_${uid}.pem`);
  const csrConfigFile = path.join(tmpDir, `zatca_csr_${uid}.cnf`);

  const cleanup = () => {
    try { fs.unlinkSync(keyFile); } catch {}
    try { fs.unlinkSync(csrConfigFile); } catch {}
  };

  try {
    // Step 1: Generate EC secp256k1 private key via OpenSSL
    const keyResult = await runOpenSSL(['ecparam', '-name', 'secp256k1', '-genkey']);
    if (!keyResult.includes('-----BEGIN EC PRIVATE KEY-----')) {
      throw new Error('OpenSSL did not generate a valid EC private key');
    }
    const privateKey = `-----BEGIN EC PRIVATE KEY-----${keyResult.split('-----BEGIN EC PRIVATE KEY-----')[1]}`.trim();

    // Write private key to temp file
    fs.writeFileSync(keyFile, privateKey, { mode: 0o600 });

    // Step 2: Write CSR config file
    const csrConfig = buildCsrConfig(config);
    fs.writeFileSync(csrConfigFile, csrConfig, { mode: 0o600 });

    // Step 3: Generate CSR using OpenSSL
    const csrResult = await runOpenSSL([
      'req', '-new', '-sha256',
      '-key', keyFile,
      '-config', csrConfigFile,
    ]);

    if (!csrResult.includes('-----BEGIN CERTIFICATE REQUEST-----')) {
      throw new Error('OpenSSL did not generate a valid CSR');
    }

    const csrPem = `-----BEGIN CERTIFICATE REQUEST-----${csrResult.split('-----BEGIN CERTIFICATE REQUEST-----')[1]}`.trim();

    // ZATCA expects: base64 encoding of the PEM CSR string
    const csrBase64 = Buffer.from(csrPem).toString('base64');

    cleanup();

    return { privateKey, csrPem, csrBase64 };
  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * Build ZATCA Basic auth header value.
 * ZATCA auth = Basic base64(binarySecurityToken:secret)
 * where binarySecurityToken is the base64-encoded certificate from ZATCA.
 */
function zatcaAuthHeader(binarySecurityToken: string, secret: string): string {
  return `Basic ${Buffer.from(`${binarySecurityToken}:${secret}`).toString('base64')}`;
}

/**
 * Submit CSR to ZATCA to get a Compliance CSID.
 * Requires a one-time OTP from the ZATCA portal (use "123345" for sandbox).
 */
export async function getComplianceCsid(
  csrBase64: string,
  otp: string,
): Promise<{
  binarySecurityToken: string;
  secret: string;
  requestId: string;
  errors?: any[];
}> {
  const response = await fetch(`${ZATCA_API_URL}/compliance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OTP': otp,
      'Accept-Version': 'V2',
    },
    body: JSON.stringify({ csr: csrBase64 }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `ZATCA compliance CSID request failed (${response.status}): ` +
      JSON.stringify(data.errors || data.message || data)
    );
  }

  return {
    binarySecurityToken: data.binarySecurityToken,
    secret: data.secret,
    requestId: data.requestID || data.requestId,
    errors: data.errors,
  };
}

/**
 * Submit a compliance invoice check.
 * Must submit at least 1 standard + 1 simplified invoice to pass.
 */
export async function submitComplianceInvoice(
  signedXml: string,
  invoiceHash: string,
  uuid: string,
  csid: string,
  secret: string,
): Promise<{
  clearanceStatus: string;
  reportingStatus: string;
  validationResults: any;
  errors?: any[];
}> {
  const response = await fetch(`${ZATCA_API_URL}/compliance/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': zatcaAuthHeader(csid, secret),
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: Buffer.from(signedXml).toString('base64'),
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `ZATCA compliance invoice check failed (${response.status}): ` +
      JSON.stringify(data.errors || data.message || data)
    );
  }

  return {
    clearanceStatus: data.clearanceStatus,
    reportingStatus: data.reportingStatus,
    validationResults: data.validationResults,
    errors: data.errors,
  };
}

/**
 * Exchange Compliance CSID for a Production CSID.
 */
export async function getProductionCsid(
  complianceCsid: string,
  complianceSecret: string,
  requestId: string,
): Promise<{
  binarySecurityToken: string;
  secret: string;
  requestId: string;
  errors?: any[];
}> {
  const response = await fetch(`${ZATCA_API_URL}/production/csids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': zatcaAuthHeader(complianceCsid, complianceSecret),
      'Accept-Version': 'V2',
    },
    body: JSON.stringify({ compliance_request_id: requestId }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `ZATCA production CSID request failed (${response.status}): ` +
      JSON.stringify(data.errors || data.message || data)
    );
  }

  return {
    binarySecurityToken: data.binarySecurityToken,
    secret: data.secret,
    requestId: data.requestID || data.requestId,
    errors: data.errors,
  };
}

/**
 * Report a simplified tax invoice (B2C) to ZATCA.
 */
export async function reportInvoice(
  signedXml: string,
  invoiceHash: string,
  uuid: string,
  pcsid: string,
  psecret: string,
): Promise<{
  reportingStatus: string;
  validationResults: any;
  errors?: any[];
}> {
  const response = await fetch(`${ZATCA_API_URL}/invoices/reporting/single`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': zatcaAuthHeader(pcsid, psecret),
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
      'Clearance-Status': '0',
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: Buffer.from(signedXml).toString('base64'),
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `ZATCA invoice reporting failed (${response.status}): ` +
      JSON.stringify(data.errors || data.message || data)
    );
  }

  return {
    reportingStatus: data.reportingStatus,
    validationResults: data.validationResults,
    errors: data.errors,
  };
}

/**
 * Clear a standard tax invoice (B2B) with ZATCA.
 */
export async function clearInvoice(
  signedXml: string,
  invoiceHash: string,
  uuid: string,
  pcsid: string,
  psecret: string,
): Promise<{
  clearanceStatus: string;
  clearedInvoice?: string;
  validationResults: any;
  errors?: any[];
}> {
  const response = await fetch(`${ZATCA_API_URL}/invoices/clearance/single`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': zatcaAuthHeader(pcsid, psecret),
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
      'Clearance-Status': '1',
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: Buffer.from(signedXml).toString('base64'),
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `ZATCA invoice clearance failed (${response.status}): ` +
      JSON.stringify(data.errors || data.message || data)
    );
  }

  return {
    clearanceStatus: data.clearanceStatus,
    clearedInvoice: data.clearedInvoice,
    validationResults: data.validationResults,
    errors: data.errors,
  };
}

// ==========================================
// UBL 2.1 XML Invoice Builder (Minimal)
// ==========================================

interface InvoiceXmlData {
  uuid: string;
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  invoiceTypeCode: string; // "388" = standard, "381" = credit, "383" = debit
  invoiceSubType: string;  // "0100000" = standard, "0200000" = simplified
  sellerName: string;
  sellerVat: string;
  sellerAddress: string;
  sellerCity: string;
  sellerCountry: string;
  buyerName: string;
  buyerVat?: string;
  currency: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  previousInvoiceHash?: string;
}

/**
 * Build a minimal UBL 2.1 XML invoice for ZATCA.
 */
export function buildUblXml(data: InvoiceXmlData): string {
  const lines = data.lineItems.map((item, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${data.currency}">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${data.currency}">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="${data.currency}">${(item.lineTotal + item.vatAmount).toFixed(2)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(item.name)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${data.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${data.uuid}</cbc:UUID>
  <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${data.invoiceSubType}">${data.invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${data.currency}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${data.invoiceNumber.replace(/\D/g, '') || '1'}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${data.previousInvoiceHash || 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzcxMGM2MWRhYmYwYWE2M2Q2MDVhZjBhNTQyNA=='}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${escapeXml(data.sellerVat)}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.sellerAddress)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.sellerCity)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${data.sellerCountry}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.sellerVat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(data.sellerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>N/A</cbc:StreetName>
        <cbc:CityName>Riyadh</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.buyerVat || '')}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(data.buyerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currency}">${data.vatTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${data.currency}">${data.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${data.currency}">${data.vatTotal.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currency}">${data.vatTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currency}">${data.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currency}">${data.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currency}">${data.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currency}">${data.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Sign an XML invoice using the private key and certificate.
 * For sandbox, we compute a hash and create a minimal signature.
 */
export function signInvoiceXml(xml: string, privateKeyPem: string, certificateBase64: string): string {
  const invoiceHash = createHash('sha256').update(xml, 'utf-8').digest('base64');

  // Create digital signature
  const signer = createSign('SHA256');
  signer.update(xml);
  const signatureValue = signer.sign(createPrivateKey(privateKeyPem), 'base64');

  // Insert UBL extensions with signature before closing </Invoice>
  const signedProps = `
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
                                    xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
                                    xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
          <sac:SignatureInformation>
            <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
            <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
              <ds:SignedInfo>
                <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
                <ds:Reference Id="invoiceSignedData" URI="">
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue>${invoiceHash}</ds:DigestValue>
                </ds:Reference>
              </ds:SignedInfo>
              <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
              <ds:KeyInfo>
                <ds:X509Data>
                  <ds:X509Certificate>${certificateBase64}</ds:X509Certificate>
                </ds:X509Data>
              </ds:KeyInfo>
            </ds:Signature>
          </sac:SignatureInformation>
        </sig:UBLDocumentSignatures>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>`;

  // Insert extensions after the opening <Invoice ...> tag
  return xml.replace(
    /(<Invoice[^>]*>)/,
    `$1${signedProps}`
  );
}

// Keep legacy export for backward compatibility during migration
export { simulateZatcaReport };

async function simulateZatcaReport(invoice: {
  invoiceNumber: string;
  zatcaUuid?: string;
  zatcaHash?: string;
}): Promise<
  | { success: true; clearanceId: string; clearedAt: Date; signedHash: string }
  | { success: false; error: string }
> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: `ZATCA rejected invoice ${invoice.invoiceNumber}: validation error BT-110 total mismatch`,
    };
  }
  const clearanceId = `CLR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const clearedAt = new Date();
  const signedHash = createHash('sha256')
    .update(`${invoice.zatcaHash || ''}|${clearanceId}|${clearedAt.toISOString()}`)
    .digest('hex');
  return { success: true, clearanceId, clearedAt, signedHash };
}
