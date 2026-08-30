import { INITIAL_CATEGORIES, INITIAL_ITEMS } from '../data/initialMenu.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const KEYS = {
  CATEGORIES: 'eat_drink_categories',
  ITEMS: 'eat_drink_items',
  BILLS: 'eat_drink_bills',
  DAILY_SUMMARIES: 'eat_drink_daily_summaries',
  PRINTER_SETTINGS: 'eat_drink_printer_settings',
  LAST_BILL_SEQ: 'eat_drink_last_bill_seq',
  OFFLINE_QUEUE: 'eat_drink_offline_queue',
};

// --- MENU DATA (HYBRID LOCAL-FIRST + SUPABASE) ---

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

export async function fetchRemoteCategories() {
  if (!isSupabaseConfigured) return getCategories();
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    if (data && data.length > 0) {
      const mapped = data.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon || 'Utensils',
        order: c.display_order || 1,
      }));
      saveCategories(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('[Supabase] Categories fetch error, using local fallback:', err.message);
  }
  return getCategories();
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

export async function fetchRemoteItems() {
  if (!isSupabaseConfigured) return getItems();
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    if (data && data.length > 0) {
      const mapped = data.map(it => ({
        id: it.id,
        categoryId: it.category_id,
        name: it.name,
        price: Number(it.price),
        active: it.is_active !== false,
      }));
      saveItems(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('[Supabase] Items fetch error, using local fallback:', err.message);
  }
  return getItems();
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
  hours = hours ? hours : 12;
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

// --- SAVE CONFIRMED BILL (ATOMIC SUPABASE PUSH + LOCAL CACHE) ---
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
    paymentMethod: billData.paymentMethod || 'CASH',
    cashGiven: billData.cashGiven !== undefined ? Number(billData.cashGiven) : undefined,
    change: billData.change !== undefined ? Number(billData.change) : undefined,
    customerName: billData.customerName || '',
    customerPhone: billData.customerPhone || '',
    dateKey: dateKey,
    date: dateDisplay,
    time: timeDisplay,
    timestamp: now.getTime(),
    createdAt: now.toISOString(),
  };

  // 1. Update local cache immediately (instant UI response)
  const allBills = getAllBills();
  allBills.unshift(finalizedBill);
  saveBills(allBills);

  // 2. Update local Daily Summary
  updateDailySummary(dateKey, finalizedBill);

  // 3. Asynchronously push to Supabase PostgreSQL
  if (isSupabaseConfigured) {
    pushBillToSupabase(finalizedBill).catch(err => {
      console.warn('[Supabase] Offline queueing bill:', err.message);
      enqueueOfflineBill(finalizedBill);
    });
  }

  return finalizedBill;
}

// Helper: Push bill + line items to Supabase
async function pushBillToSupabase(bill) {
  const { data: billRecord, error: billError } = await supabase
    .from('bills')
    .insert({
      bill_number: bill.billNumber,
      subtotal: bill.subtotal,
      discount: bill.discount,
      total: bill.total,
      payment_method: bill.paymentMethod,
      cash_given: bill.cashGiven ?? null,
      change_given: bill.change ?? null,
      customer_name: bill.customerName || '',
      customer_phone: bill.customerPhone || '',
      bill_date: bill.dateKey,
    })
    .select()
    .single();

  if (billError) throw billError;

  if (bill.items && bill.items.length > 0) {
    const lineItems = bill.items.map(it => {
      const price = it.unitPrice || it.price || 0;
      return {
        bill_id: billRecord.id,
        menu_item_id: it.id?.startsWith('itm_') ? it.id : null,
        item_name: it.itemName || it.name,
        unit_price: price,
        quantity: it.quantity || 1,
        item_total: price * (it.quantity || 1),
      };
    });

    const { error: itemsError } = await supabase.from('bill_items').insert(lineItems);
    if (itemsError) throw itemsError;
  }

  return billRecord;
}

// Offline queue helpers
function enqueueOfflineBill(bill) {
  try {
    const queue = JSON.parse(localStorage.getItem(KEYS.OFFLINE_QUEUE) || '[]');
    queue.push(bill);
    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

export async function syncOfflineBills() {
  if (!isSupabaseConfigured) return;
  try {
    const queue = JSON.parse(localStorage.getItem(KEYS.OFFLINE_QUEUE) || '[]');
    if (queue.length === 0) return;

    const remaining = [];
    for (const bill of queue) {
      try {
        await pushBillToSupabase(bill);
      } catch (err) {
        remaining.push(bill);
      }
    }
    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(remaining));
  } catch (e) {}
}

// Fetch all bills from Supabase with fallback
export async function fetchRemoteBills() {
  if (!isSupabaseConfigured) return getAllBills();
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const mapped = data.map(b => ({
        id: b.id,
        billNumber: b.bill_number,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        total: Number(b.total),
        paymentMethod: b.payment_method,
        cashGiven: b.cash_given ? Number(b.cash_given) : undefined,
        change: b.change_given ? Number(b.change_given) : undefined,
        customerName: b.customer_name || '',
        customerPhone: b.customer_phone || '',
        dateKey: b.bill_date,
        date: formatDateDisplay(b.bill_date),
        time: new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: (b.bill_items || []).map(bi => ({
          itemName: bi.item_name,
          name: bi.item_name,
          unitPrice: Number(bi.unit_price),
          price: Number(bi.unit_price),
          quantity: bi.quantity,
        })),
        createdAt: b.created_at,
      }));
      saveBills(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('[Supabase] Bills fetch error, using local fallback:', err.message);
  }
  return getAllBills();
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
    paperWidth: '80mm',
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

// --- RESET ALL BILLS & RESTART FROM ZERO ---
export async function clearAllBillsAndResetSales() {
  // 1. Clear local storage records
  localStorage.removeItem(KEYS.BILLS);
  localStorage.removeItem(KEYS.DAILY_SUMMARIES);
  localStorage.removeItem(KEYS.OFFLINE_QUEUE);
  localStorage.setItem(KEYS.LAST_BILL_SEQ, '0');

  // 2. Clear Supabase tables if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from('bill_items').delete().neq('item_name', '__non_existent__');
      await supabase.from('bills').delete().neq('bill_number', '__non_existent__');
    } catch (err) {
      console.warn('[Supabase] Error truncating remote bills:', err.message);
    }
  }

  return true;
}

// --- DATABASE BACKUP / RESTORE ---
export function exportFullDatabase() {
  return {
    version: '2.0 (Supabase Ready)',
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
