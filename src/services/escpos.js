// ESC/POS Binary Command Encoder for 58mm & 80mm Bluetooth Thermal POS Printers

export class EscPosBuilder {
  constructor(paperWidth = '80mm') {
    this.is58mm = paperWidth === '58mm';
    this.lineWidth = this.is58mm ? 32 : 48;
    this.buffer = [];
  }

  // Append raw bytes
  raw(bytes) {
    if (Array.isArray(bytes)) {
      this.buffer.push(...bytes);
    } else if (bytes instanceof Uint8Array) {
      this.buffer.push(...Array.from(bytes));
    }
    return this;
  }

  // Initialize printer
  init() {
    return this.raw([0x1B, 0x40]); // ESC @
  }

  // Alignment: 'left', 'center', 'right'
  align(alignment = 'left') {
    const map = { left: 0, center: 1, right: 2 };
    const val = map[alignment] ?? 0;
    return this.raw([0x1B, 0x61, val]); // ESC a n
  }

  // Bold text on / off
  bold(enable = true) {
    return this.raw([0x1B, 0x45, enable ? 1 : 0]); // ESC E n
  }

  // Text size: normal, double-height, double-width, large
  size(mode = 'normal') {
    let n = 0x00;
    if (mode === 'double-height') n = 0x10;
    else if (mode === 'double-width') n = 0x20;
    else if (mode === 'large') n = 0x30;
    return this.raw([0x1D, 0x21, n]); // GS ! n
  }

  // Feed n lines
  feed(lines = 1) {
    return this.raw([0x1B, 0x64, Math.max(1, lines)]); // ESC d n
  }

  // Paper cut (Partial / Full)
  cut(full = false) {
    return this.raw([0x1D, 0x56, full ? 0x00 : 0x01]); // GS V n
  }

  // Text encoder with clean ASCII and safe Rupee string
  text(str = '') {
    // Replace Rupee Unicode (U+20B9) with Rs. to prevent single-byte thermal printer code-page corruption
    const safeStr = String(str)
      .replace(/[\u20B9\u20A8]/g, 'Rs.')
      .replace(/[^\x20-\x7E\n\r]/g, ' ');

    const bytes = [];
    for (let i = 0; i < safeStr.length; i++) {
      bytes.push(safeStr.charCodeAt(i) & 0xFF);
    }
    return this.raw(bytes);
  }

  // Print line with automatic newline
  textLine(str = '') {
    this.text(str);
    return this.raw([0x0A]); // LF
  }

  // Dashed divider line
  dashedLine() {
    return this.textLine('-'.repeat(this.lineWidth));
  }

  // Double dashed divider line
  doubleDashedLine() {
    return this.textLine('='.repeat(this.lineWidth));
  }

  // Center text line
  centerLine(str = '') {
    this.align('center');
    this.textLine(str);
    this.align('left');
    return this;
  }

  // Two columns row: [Left, Right]
  row(left = '', right = '') {
    const safeLeft = String(left).replace(/[\u20B9\u20A8]/g, 'Rs.');
    const safeRight = String(right).replace(/[\u20B9\u20A8]/g, 'Rs.');
    const space = Math.max(1, this.lineWidth - safeLeft.length - safeRight.length);
    return this.textLine(safeLeft + ' '.repeat(space) + safeRight);
  }

  // Format table item row with word wrapping
  itemRow(name = '', qty = 1, amount = 0) {
    const qtyStr = String(qty);
    const amtStr = 'Rs.' + Number(amount).toFixed(2);

    if (this.is58mm) {
      // 58mm: 32 chars -> Name (up to 16) | Qty (3) | Amt (10)
      const maxNameLen = this.lineWidth - qtyStr.length - amtStr.length - 2;
      if (name.length <= maxNameLen) {
        const space = Math.max(1, this.lineWidth - name.length - qtyStr.length - amtStr.length - 1);
        return this.textLine(`${name} ${qtyStr}${' '.repeat(space)}${amtStr}`);
      } else {
        // Multi-line wrap
        this.textLine(name);
        const indent = '  ';
        const space = Math.max(1, this.lineWidth - indent.length - qtyStr.length - amtStr.length - 1);
        return this.textLine(`${indent}x${qtyStr}${' '.repeat(space)}${amtStr}`);
      }
    } else {
      // 80mm: 48 chars -> Name (26) | Qty (6) | Amt (14)
      const nameCol = name.length > 26 ? name.substring(0, 25) + '.' : name.padEnd(26, ' ');
      const qtyCol = qtyStr.padStart(6, ' ');
      const amtCol = amtStr.padStart(15, ' ');
      return this.textLine(`${nameCol}${qtyCol}${amtCol}`);
    }
  }

  // Convert monochrome image to ESC/POS Raster Bit-Image (GS v 0)
  async appendRasterImage(imageSrc, targetWidth = 240) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return this;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Calculate scaled dimensions (width must be multiple of 8)
      const width = Math.floor(targetWidth / 8) * 8;
      const height = Math.floor((img.height * (width / img.width)));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height).data;
      const widthBytes = width / 8;
      const rasterBytes = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < widthBytes; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const pixelX = x * 8 + bit;
            const idx = (y * width + pixelX) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            // Luminance threshold for black/white pixel
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            const isBlack = (a > 128 && luminance < 160);
            if (isBlack) {
              byte |= (1 << (7 - bit));
            }
          }
          rasterBytes.push(byte);
        }
      }

      // GS v 0 m xL xH yL yH d1...dk
      this.align('center');
      this.raw([
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF,
        (widthBytes >> 8) & 0xFF,
        height & 0xFF,
        (height >> 8) & 0xFF
      ]);
      this.raw(rasterBytes);
      this.raw([0x0A]); // LF
      this.align('left');
    } catch (err) {
      console.warn('Could not rasterize logo for ESC/POS, falling back to text:', err);
    }
    return this;
  }

  // Build full receipt payload
  async buildReceipt(bill, config = {}) {
    const is58mm = this.is58mm;
    const shopName = config.shopName || 'EAT & DRINK';
    const shopLocation = config.shopLocation || 'MANGALAGIRI';
    const footerMsg = config.footerMessage || 'THANK YOU! VISIT AGAIN';

    this.init();

    // 1. Logo at Top
    const logoWidth = is58mm ? 184 : 264;
    await this.appendRasterImage('/eat-and-drink.png', logoWidth);

    // 2. Header Text
    this.align('center');
    this.bold(true);
    this.size('double-height');
    this.textLine(shopName);
    this.size('normal');
    this.textLine(shopLocation);
    this.bold(false);
    this.align('left');

    this.doubleDashedLine();

    // 3. Bill Meta Info
    this.row(`Bill No: ${bill.billNumber}`, bill.time || '');
    this.row(`Date: ${bill.date}`, `Pay: ${bill.paymentMethod}`);
    if (bill.customerName) {
      this.textLine(`Customer: ${bill.customerName} ${bill.customerPhone ? '(' + bill.customerPhone + ')' : ''}`);
    }

    this.dashedLine();

    // 4. Table Header
    if (is58mm) {
      this.row('ITEM [QTY]', 'AMOUNT');
    } else {
      this.textLine('ITEM                         QTY          AMOUNT');
    }
    this.dashedLine();

    // 5. Items
    (bill.items || []).forEach(item => {
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const total = unitPrice * (item.quantity || 1);
      this.itemRow(item.itemName || item.name, item.quantity, total);
    });

    this.dashedLine();

    // 6. Totals
    this.row('Subtotal:', `Rs.${Number(bill.subtotal || 0).toFixed(2)}`);
    if (Number(bill.discount || 0) > 0) {
      this.row('Discount:', `-Rs.${Number(bill.discount).toFixed(2)}`);
    }

    this.doubleDashedLine();
    this.bold(true);
    this.size(is58mm ? 'normal' : 'double-height');
    this.row('TOTAL AMOUNT:', `Rs.${Number(bill.total || 0).toFixed(2)}`);
    this.size('normal');
    this.bold(false);

    if (bill.paymentMethod === 'CASH' && bill.cashGiven !== undefined) {
      this.row('Cash Given:', `Rs.${Number(bill.cashGiven).toFixed(2)}`);
      this.row('Change:', `Rs.${Number(bill.change ?? (bill.cashGiven - bill.total)).toFixed(2)}`);
    }

    this.row('Payment Status:', `${bill.paymentMethod} (PAID)`);
    this.doubleDashedLine();

    // 7. Footer
    this.align('center');
    this.bold(true);
    this.textLine(footerMsg);
    this.bold(false);
    this.textLine(`*** ${shopName} ${shopLocation} ***`);
    this.align('left');

    // 8. Feed & Cut
    this.feed(is58mm ? 4 : 5);
    this.cut(false);

    return new Uint8Array(this.buffer);
  }

  // Build test slip payload (does not touch database)
  async buildTestSlip(config = {}) {
    const is58mm = this.is58mm;
    const shopName = config.shopName || 'EAT & DRINK';
    const shopLocation = config.shopLocation || 'MANGALAGIRI';

    this.init();

    const logoWidth = is58mm ? 184 : 264;
    await this.appendRasterImage('/eat-and-drink.png', logoWidth);

    this.align('center');
    this.bold(true);
    this.textLine(shopName);
    this.textLine(shopLocation);
    this.bold(false);

    this.doubleDashedLine();
    this.bold(true);
    this.textLine('THERMAL PRINTER TEST');
    this.bold(false);
    this.doubleDashedLine();

    const now = new Date();
    this.row('Status:', 'CONNECTED (READY)');
    this.row('Paper Size:', is58mm ? '58mm (32 Col)' : '80mm (48 Col)');
    this.row('Date:', now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    this.row('Time:', now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

    this.dashedLine();
    this.align('center');
    this.bold(true);
    this.textLine('TEST PRINT SUCCESSFUL!');
    this.bold(false);
    this.dashedLine();
    this.textLine(`*** ${shopName} ${shopLocation} ***`);
    this.align('left');

    this.feed(is58mm ? 4 : 5);
    this.cut(false);

    return new Uint8Array(this.buffer);
  }

  // Export Uint8Array
  toUint8Array() {
    return new Uint8Array(this.buffer);
  }
}
