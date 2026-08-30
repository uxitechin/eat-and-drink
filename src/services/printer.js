// Unified Printer Service for EAT & DRINK POS
// Supports Direct ESC/POS Bluetooth Thermal Printing, Device-Specific Persistence, and Clean Monospace Previews

import { EscPosBuilder } from './escpos.js';
import { bluetoothPrinter } from './bluetoothPrinter.js';

export { bluetoothPrinter };

/**
 * Generates canonical monospace receipt text for preview and monospace rendering.
 */
export function generateReceiptText(bill, settings) {
  const is58mm = settings?.paperWidth === '58mm';
  const width = is58mm ? 32 : 44;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);

  function center(text) {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  }

  function row(left, right) {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  }

  function itemRow(name, qty, amt) {
    const qtyStr = String(qty);
    const amtStr = 'Rs.' + amt.toFixed(2);
    if (is58mm) {
      const maxNameLen = width - qtyStr.length - amtStr.length - 2;
      const truncName = name.length > maxNameLen ? name.substring(0, maxNameLen - 1) + '.' : name;
      const space1 = Math.max(1, width - truncName.length - qtyStr.length - amtStr.length - 1);
      return `${truncName} ${qtyStr}${' '.repeat(space1)}${amtStr}`;
    } else {
      const nameCol = name.length > 22 ? name.substring(0, 21) + '.' : name.padEnd(22, ' ');
      const qtyCol = String(qty).padStart(6, ' ');
      const amtCol = amtStr.padStart(14, ' ');
      return `${nameCol}${qtyCol}${amtCol}`;
    }
  }

  const lines = [
    doubleLine,
    center(settings?.shopName || 'EAT & DRINK'),
    center(settings?.shopLocation || 'MANGALAGIRI'),
    doubleLine,
    row(`Bill No: ${bill.billNumber}`, bill.time || ''),
    row(`Date: ${bill.date}`, `Pay: ${bill.paymentMethod}`),
    line,
  ];

  if (is58mm) {
    lines.push(row('ITEM [QTY]', 'AMOUNT'));
  } else {
    lines.push('ITEM                      QTY        AMOUNT');
  }
  lines.push(line);

  (bill.items || []).forEach(item => {
    const unitPrice = item.unitPrice || item.price || 0;
    const itemTotal = unitPrice * (item.quantity || 1);
    lines.push(itemRow(item.itemName || item.name, item.quantity, itemTotal));
  });

  lines.push(line);
  lines.push(row('Subtotal:', `Rs.${Number(bill.subtotal || 0).toFixed(2)}`));
  if (Number(bill.discount || 0) > 0) {
    lines.push(row('Discount:', `-Rs.${Number(bill.discount).toFixed(2)}`));
  }
  lines.push(doubleLine);
  lines.push(row('TOTAL AMOUNT:', `Rs.${Number(bill.total || 0).toFixed(2)}`));
  if (bill.paymentMethod === 'CASH' && bill.cashGiven !== undefined) {
    lines.push(row('Cash Given:', `Rs.${Number(bill.cashGiven).toFixed(2)}`));
    lines.push(row('Change:', `Rs.${Number(bill.change ?? (bill.cashGiven - bill.total)).toFixed(2)}`));
  }
  lines.push(row('PAYMENT STATUS:', `${bill.paymentMethod} (PAID)`));
  lines.push(doubleLine);
  lines.push('');
  lines.push(center(settings?.footerMessage || 'THANK YOU! VISIT AGAIN'));
  lines.push(center('*** EAT & DRINK MANGALAGIRI ***'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Direct ESC/POS Bluetooth Thermal Receipt Printer Dispatch
 * Checks for paired Bluetooth printer on this device and sends binary ESC/POS stream.
 */
export async function printReceipt(bill, settings = {}) {
  const savedConfig = bluetoothPrinter.getSavedConfig();
  const paperWidth = settings.paperWidth || savedConfig?.paperWidth || '80mm';

  // If no printer configured on this device yet
  if (!savedConfig) {
    const err = new Error('NO_PRINTER_CONFIGURED');
    err.code = 'NO_PRINTER_CONFIGURED';
    throw err;
  }

  // 1. Build ESC/POS binary command payload with monochrome logo
  const builder = new EscPosBuilder(paperWidth);
  const binaryPayload = await builder.buildReceipt(bill, {
    shopName: settings.shopName || 'EAT & DRINK',
    shopLocation: settings.shopLocation || 'MANGALAGIRI',
    footerMessage: settings.footerMessage || 'THANK YOU! VISIT AGAIN'
  });

  // 2. Send over Bluetooth directly to printer head
  try {
    await bluetoothPrinter.writeBinaryChunks(binaryPayload);
    return { success: true, billNumber: bill.billNumber };
  } catch (err) {
    if (err.message === 'PRINTER_OFFLINE') {
      const offlineErr = new Error('PRINTER_OFFLINE');
      offlineErr.code = 'PRINTER_OFFLINE';
      throw offlineErr;
    }
    throw err;
  }
}

/**
 * Dedicated Thermal Printer Test Slip (Does NOT affect sales or Supabase records)
 */
export async function printTestReceipt(settings = {}) {
  const savedConfig = bluetoothPrinter.getSavedConfig();
  const paperWidth = settings.paperWidth || savedConfig?.paperWidth || '80mm';

  if (!savedConfig) {
    const err = new Error('NO_PRINTER_CONFIGURED');
    err.code = 'NO_PRINTER_CONFIGURED';
    throw err;
  }

  const builder = new EscPosBuilder(paperWidth);
  const binaryPayload = await builder.buildTestSlip({
    shopName: settings.shopName || 'EAT & DRINK',
    shopLocation: settings.shopLocation || 'MANGALAGIRI'
  });

  await bluetoothPrinter.writeBinaryChunks(binaryPayload);
  return { success: true };
}
