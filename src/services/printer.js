export const AVAILABLE_PRINTERS = [
  { id: 'p_default', name: 'Default Thermal POS Printer', type: 'thermal', status: 'ready' },
  { id: 'p_posiflow', name: 'Posiflow POS-80 / 58 Thermal', type: 'thermal', status: 'ready' },
  { id: 'p_epson_t82', name: 'EPSON TM-T82 Thermal Printer', type: 'thermal', status: 'ready' },
  { id: 'p_xprinter', name: 'XPrinter XP-Q200 80mm', type: 'thermal', status: 'ready' },
  { id: 'p_pos58', name: 'POS-58 Countertop Thermal (58mm)', type: 'thermal', status: 'ready' }
];

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
    const amtStr = '?' + amt.toFixed(2);
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
  lines.push(row('Subtotal:', `?${Number(bill.subtotal || 0).toFixed(2)}`));
  if (Number(bill.discount || 0) > 0) {
    lines.push(row('Discount:', `-?${Number(bill.discount).toFixed(2)}`));
  }
  lines.push(doubleLine);
  lines.push(row('TOTAL AMOUNT:', `?${Number(bill.total || 0).toFixed(2)}`));
  if (bill.paymentMethod === 'CASH' && bill.cashGiven !== undefined) {
    lines.push(row('Cash Given:', `?${Number(bill.cashGiven).toFixed(2)}`));
    lines.push(row('Change:', `?${Number(bill.change ?? (bill.cashGiven - bill.total)).toFixed(2)}`));
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
 * Isolated iframe-based Thermal Printer Pipeline
 * Renders ONLY the receipt into an isolated hidden iframe and calls print.
 * Custom styled for 58mm and 80mm thermal rolls with monochrome high-contrast logo.
 */
export function printReceipt(bill, settings) {
  return new Promise((resolve, reject) => {
    try {
      const is58mm = settings?.paperWidth === '58mm';
      const paperWidthPx = is58mm ? '58mm' : '80mm';
      const maxReceiptWidth = is58mm ? '215px' : '290px';

      // 1. Find or create hidden printing iframe
      let printFrame = document.getElementById('thermal-print-frame');
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'thermal-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;

      // 2. Build items HTML
      const itemsHtml = (bill.items || []).map(item => {
        const unitPrice = item.unitPrice || item.price || 0;
        const total = unitPrice * (item.quantity || 1);
        return `
          <tr>
            <td style="padding: 2px 0; font-weight: bold; word-break: break-word;">${item.itemName || item.name}</td>
            <td style="padding: 2px 4px; text-align: center; font-weight: bold;">${item.quantity}</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">?${total.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const discountHtml = Number(bill.discount || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>Discount:</span>
          <span>-?${Number(bill.discount).toFixed(2)}</span>
        </div>
      ` : '';

      const customerHtml = bill.customerName ? `
        <div style="font-size: 10px; color: #000; margin-top: 2px;">
          Customer: ${bill.customerName} ${bill.customerPhone ? '(' + bill.customerPhone + ')' : ''}
        </div>
      ` : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt_${bill.billNumber}</title>
          <style>
            @page {
              size: ${paperWidthPx} auto;
              margin: 0mm;
            }
            @media print {
              html, body {
                width: ${paperWidthPx};
                margin: 0 !important;
                padding: 2mm !important;
              }
            }
            body {
              margin: 0;
              padding: 3mm 2mm;
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: ${is58mm ? '11px' : '12px'};
              line-height: 1.25;
              color: #000000;
              background: #ffffff;
              width: ${maxReceiptWidth};
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 900; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .double-dashed { border-top: 2px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; font-size: inherit; }
            .logo-text { font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; letter-spacing: 1px; }
            .sub-text { font-size: 10px; font-weight: bold; letter-spacing: 2px; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo-thermal.svg" alt="EAT & DRINK" style="height: 48px; width: auto; max-width: 140px; margin: 0 auto 2px auto; display: block;" />
          </div>
          <div class="double-dashed"></div>
          
          <div class="flex-between bold">
            <span>Bill: ${bill.billNumber}</span>
            <span>${bill.time || ''}</span>
          </div>
          <div class="flex-between" style="font-size: 10px;">
            <span>Date: ${bill.date}</span>
            <span>Pay: ${bill.paymentMethod}</span>
          </div>
          ${customerHtml}

          <div class="dashed"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000; font-size: 10px;">
                <th style="text-align: left; padding-bottom: 2px;">ITEM</th>
                <th style="text-align: center; padding-bottom: 2px; width: 35px;">QTY</th>
                <th style="text-align: right; padding-bottom: 2px; width: 60px;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="dashed"></div>
          <div class="flex-between">
            <span>Subtotal:</span>
            <span>?${Number(bill.subtotal || 0).toFixed(2)}</span>
          </div>
          ${discountHtml}
          <div class="double-dashed"></div>
          <div class="flex-between bold" style="font-size: ${is58mm ? '13px' : '14px'};">
            <span>TOTAL AMOUNT:</span>
            <span>?${Number(bill.total || 0).toFixed(2)}</span>
          </div>
          ${bill.paymentMethod === 'CASH' && bill.cashGiven !== undefined ? `
            <div class="flex-between" style="font-size: 10px; margin-top: 2px;">
              <span>Cash Given:</span>
              <span>?${Number(bill.cashGiven).toFixed(2)}</span>
            </div>
            <div class="flex-between" style="font-size: 10px;">
              <span>Change:</span>
              <span>?${Number(bill.change ?? (bill.cashGiven - bill.total)).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="flex-between" style="font-size: 10px; margin-top: 2px;">
            <span>Payment Status:</span>
            <span class="bold">${bill.paymentMethod} (PAID)</span>
          </div>

          <div class="double-dashed"></div>
          <div class="center" style="font-size: 10px; margin-top: 4px;">
            <div class="bold">${settings?.footerMessage || 'THANK YOU! VISIT AGAIN'}</div>
            <div style="font-size: 9px; margin-top: 2px;">*** EAT & DRINK MANGALAGIRI ***</div>
          </div>
        </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          resolve({ success: true, billNumber: bill.billNumber });
        } catch (err) {
          window.print();
          resolve({ success: true, billNumber: bill.billNumber });
        }
      }, 150);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Dedicated Thermal Printer Test Slip (Does NOT affect sales or Supabase records)
 */
export function printTestReceipt(settings) {
  return new Promise((resolve, reject) => {
    try {
      const is58mm = settings?.paperWidth === '58mm';
      const paperWidthPx = is58mm ? '58mm' : '80mm';
      const maxReceiptWidth = is58mm ? '215px' : '290px';

      let printFrame = document.getElementById('thermal-print-frame');
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'thermal-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Printer_Test</title>
          <style>
            @page {
              size: ${paperWidthPx} auto;
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 3mm 2mm;
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: ${is58mm ? '11px' : '12px'};
              line-height: 1.3;
              color: #000000;
              background: #ffffff;
              width: ${maxReceiptWidth};
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .double-dashed { border-top: 2px dashed #000; margin: 5px 0; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo-thermal.svg" alt="EAT & DRINK" style="height: 48px; width: auto; max-width: 140px; margin: 0 auto 2px auto; display: block;" />
          </div>
          <div class="double-dashed"></div>
          <div class="center bold" style="font-size: 13px;">THERMAL PRINTER TEST</div>
          <div class="double-dashed"></div>
          <div class="flex-between">
            <span>Paper Size:</span>
            <span class="bold">${settings?.paperWidth || '80mm'}</span>
          </div>
          <div class="flex-between">
            <span>Printer:</span>
            <span class="bold">Connected (Ready)</span>
          </div>
          <div class="flex-between">
            <span>Date:</span>
            <span>${dateStr}</span>
          </div>
          <div class="flex-between">
            <span>Time:</span>
            <span>${timeStr}</span>
          </div>
          <div class="dashed"></div>
          <div class="center bold" style="margin: 6px 0; font-size: 13px;">
            TEST PRINT SUCCESSFUL!
          </div>
          <div class="dashed"></div>
          <div class="center" style="font-size: 9px; margin-top: 4px;">
            *** EAT & DRINK MANGALAGIRI ***
          </div>
        </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          resolve({ success: true });
        } catch (err) {
          window.print();
          resolve({ success: true });
        }
      }, 150);
    } catch (e) {
      reject(e);
    }
  });
}
