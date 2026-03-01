// ==========================================
// ZATCA Phase 1 — TLV QR Code Builder (Browser)
// ==========================================

/**
 * Build a ZATCA-compliant TLV (Tag-Length-Value) binary and return it as Base64.
 *
 * Tags:
 *  1 – Seller Name (UTF-8)
 *  2 – VAT Registration Number
 *  3 – Timestamp (ISO-8601)
 *  4 – Invoice Total (with VAT)
 *  5 – VAT Amount
 */
export function buildZatcaTlv(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatAmount: number,
): string {
  const encoder = new TextEncoder();
  const tlvParts: Uint8Array[] = [];
  const entries = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: timestamp },
    { tag: 4, value: totalWithVat.toFixed(2) },
    { tag: 5, value: vatAmount.toFixed(2) },
  ];
  for (const entry of entries) {
    const valueBytes = encoder.encode(entry.value);
    const tlv = new Uint8Array(2 + valueBytes.length);
    tlv[0] = entry.tag;
    tlv[1] = valueBytes.length;
    tlv.set(valueBytes, 2);
    tlvParts.push(tlv);
  }
  const totalLen = tlvParts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of tlvParts) {
    result.set(part, offset);
    offset += part.length;
  }
  return btoa(String.fromCharCode.apply(null, Array.from(result)));
}
