import { INITIAL_CATEGORIES, INITIAL_ITEMS } from '../data/initialMenu.js';


const KEYS = {
  CATEGORIES: 'eat_drink_categories',
  ITEMS: 'eat_drink_items',
  BILLS: 'eat_drink_bills',
  DAILY_SUMMARIES: 'eat_drink_daily_summaries',
  PRINTER_SETTINGS: 'eat_drink_printer_settings',
  LAST_BILL_SEQ: 'eat_drink_last_bill_seq',
};

// --- MENU DATA ---
export function getCategories() {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  if (!data) {
    saveCategories(INITIAL_CATEGORIES);
    return INITIAL_CATEGORIES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories) {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

export function getItems() {
  const data = localStorage.getItem(KEYS.ITEMS);
  if (!data) {
    saveItems(INITIAL_ITEMS);
    return INITIAL_ITEMS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_ITEMS;
  }
}

export function saveItems(items) {
  localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
}

export function resetMenuToDefault() {
  saveCategories(INITIAL_CATEGORIES);
  saveItems(INITIAL_ITEMS);
  return { categories: INITIAL_CATEGORIES, items: INITIAL_ITEMS };
}

// --- DATE HELPERS ---
export function getTodayDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

export function formatTimeDisplay(d = new Date()) {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 is 12
  return `${hours}:${minutes} ${ampm}`;
}

// --- BILL SEQUENCE & BILLS ---
export function getNextBillNumber() {
  let seq = parseInt(localStorage.getItem(KEYS.LAST_BILL_SEQ) || '0', 10);
  seq += 1;
  localStorage.setItem(KEYS.LAST_BILL_SEQ, String(seq));
  return `#${String(seq).padStart(6, '0')}`;
}

export function getAllBills() {
  const data = localStorage.getItem(KEYS.BILLS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveBills(bills) {
  localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
}

// Save confirmed bill (IDEMPOTENT & ACCURATE SALES RECORDING)
export function saveConfirmedBill(billData) {
  const now = new Date();
  const dateKey = getTodayDateKey(now);
  const dateDisplay = formatDateDisplay(dateKey);
  const timeDisplay = formatTimeDisplay(now);

  const billNumber = billData.billNumber || getNextBillNumber();
  
  const finalizedBill = {
    id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    billNumber: billNumber,
    items: billData.items || [],
    subtotal: Number(billData.subtotal) || 0,
    discount: Number(billData.discount) || 0,
    total: Number(billData.total) || 0,
    paymentMethod: billData.paymentMethod || 'CASH', // 'CASH' or 'UPI'
    customerName: billData.customerName || '',
    customerPhone: billData.customerPhone || '',
    dateKey: dateKey,
    date: dateDisplay,
    time: timeDisplay,
    timestamp: now.getTime(),
    createdAt: now.toISOString(),
  };

  // 1. Add to bills store
  const allBills = getAllBills();
  allBills.unshift(finalizedBill);
  saveBills(allBills);

  // 2. Update Daily Summary for dateKey
  updateDailySummary(dateKey, finalizedBill);

  return finalizedBill;
}

// --- DAILY SUMMARIES ---
export function getAllDailySummaries() {
  const data = localStorage.getItem(KEYS.DAILY_SUMMARIES);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function saveDailySummaries(summaries) {
  localStorage.setItem(KEYS.DAILY_SUMMARIES, JSON.stringify(summaries));
}

function updateDailySummary(dateKey, bill) {
  const summaries = getAllDailySummaries();
  const current = summaries[dateKey] || {
    dateKey: dateKey,
    dateDisplay: formatDateDisplay(dateKey),
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    billCount: 0,
    itemCount: 0,
  };

  current.totalSales += bill.total;
  if (bill.paymentMethod === 'CASH') {
    current.cashSales += bill.total;
  } else {
    current.upiSales += bill.total;
  }
  current.billCount += 1;
  
  const itemsInBill = bill.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  current.itemCount += itemsInBill;

  summaries[dateKey] = current;
  saveDailySummaries(summaries);
}

export function getTodaySummary() {
  const dateKey = getTodayDateKey();
  const summaries = getAllDailySummaries();
  
  if (summaries[dateKey]) {
    return summaries[dateKey];
  }
  
  return {
    dateKey: dateKey,
    dateDisplay: formatDateDisplay(dateKey),
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    billCount: 0,
    itemCount: 0,
  };
}

// --- PRINTER SETTINGS ---
export function getPrinterSettings() {
  const data = localStorage.getItem(KEYS.PRINTER_SETTINGS);
  const defaultSettings = {
    selectedPrinter: 'Default System Printer',
    paperWidth: '80mm', // '58mm' or '80mm'
    shopName: 'EAT & DRINK',
    shopLocation: 'MANGALAGIRI',
    footerMessage: 'THANK YOU! VISIT AGAIN',
    autoPrint: false,
    soundEnabled: true,
  };
  if (!data) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    return defaultSettings;
  }
}

export function savePrinterSettings(settings) {
  localStorage.setItem(KEYS.PRINTER_SETTINGS, JSON.stringify(settings));
}

// --- DATABASE BACKUP / RESTORE ---
export function exportFullDatabase() {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories: getCategories(),
    items: getItems(),
    bills: getAllBills(),
    dailySummaries: getAllDailySummaries(),
    printerSettings: getPrinterSettings(),
    lastBillSeq: localStorage.getItem(KEYS.LAST_BILL_SEQ) || '0',
  };
}

export function importFullDatabase(db) {
  if (!db || typeof db !== 'object') throw new Error('Invalid database JSON');
  if (db.categories) saveCategories(db.categories);
  if (db.items) saveItems(db.items);
  if (db.bills) saveBills(db.bills);
  if (db.dailySummaries) saveDailySummaries(db.dailySummaries);
  if (db.printerSettings) savePrinterSettings(db.printerSettings);
  if (db.lastBillSeq) localStorage.setItem(KEYS.LAST_BILL_SEQ, String(db.lastBillSeq));
  return true;
}
