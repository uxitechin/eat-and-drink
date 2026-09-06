import { INITIAL_CATEGORIES, INITIAL_ITEMS } from '../data/initialMenu.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { logger } from './logger.js';

const KEYS = {
  CATEGORIES: 'eat_drink_categories',
  ITEMS: 'eat_drink_items',
  BILLS: 'eat_drink_bills',
  DAILY_SUMMARIES: 'eat_drink_daily_summaries',
  PRINTER_SETTINGS: 'eat_drink_printer_settings',
  LAST_BILL_SEQ: 'eat_drink_last_bill_seq',
};

// Filter out test-generated bills
const EXCLUDED_TEST_BILLS = new Set(['#000030', '#000031', '#000032', '#000033', '#000034']);
export const isTestBill = (b) => {
  if (!b) return false;
  const num = b.billNumber || b.bill_number || '';
  const cust = b.customerName || b.customer_name || '';
  return EXCLUDED_TEST_BILLS.has(num) || cust === 'Test Cashier';
};

// Safe LocalStorage helpers that never throw and never clear other data
function safeGetJSON(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    logger.warn('Storage', `Corrupted localStorage value for key: ${key}. Using fallback.`, err);
    return fallback;
  }
}

function safeSetJSON(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.warn('Storage', `Failed to set localStorage for key: ${key}`, err);
  }
}

// --- MENU DATA (SUPABASE PRIMARY + LOCAL FALLBACK) ---

export function getCategories() {
  const cached = safeGetJSON(KEYS.CATEGORIES, null);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  return INITIAL_CATEGORIES;
}

export function saveCategories(categories) {
  if (Array.isArray(categories) && categories.length > 0) {
    safeSetJSON(KEYS.CATEGORIES, categories);
  }
}

export async function fetchRemoteCategories() {
  if (!isSupabaseConfigured) return getCategories();
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
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
    logger.warn('Storage', 'Categories fetch failed, keeping previous state', err);
  }
  return getCategories();
}

export function getItems() {
  const cached = safeGetJSON(KEYS.ITEMS, null);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  return INITIAL_ITEMS;
}

export function saveItems(items) {
  if (Array.isArray(items) && items.length > 0) {
    safeSetJSON(KEYS.ITEMS, items);
  }
}

export async function fetchRemoteItems() {
  if (!isSupabaseConfigured) return getItems();
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
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
    logger.warn('Storage', 'Items fetch failed, keeping previous state', err);
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
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
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

// --- RELIABLE SEQUENTIAL BILL NUMBERING ---
export async function getNextBillNumber() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .not('bill_number', 'in', '("#000030","#000031","#000032","#000033","#000034")')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].bill_number) {
        const match = data[0].bill_number.match(/\d+/);
        if (match) {
          const nextSeq = parseInt(match[0], 10) + 1;
          return `#${String(nextSeq).padStart(6, '0')}`;
        }
      }
      return '#000030';
    } catch (e) {
      logger.warn('Storage', 'Error querying next bill number from Supabase', e);
    }
  }

  // Fallback to local sequence
  let seq = parseInt(safeGetJSON(KEYS.LAST_BILL_SEQ, '29'), 10);
  if (isNaN(seq) || seq >= 30) seq = 29;
  seq += 1;
  safeSetJSON(KEYS.LAST_BILL_SEQ, String(seq));
  return `#${String(seq).padStart(6, '0')}`;
}

export function getAllBills() {
  return safeGetJSON(KEYS.BILLS, []).filter(b => !isTestBill(b));
}

export function saveBills(bills) {
  if (Array.isArray(bills)) {
    const clean = bills.filter(b => !isTestBill(b));
    safeSetJSON(KEYS.BILLS, clean);
  }
}

// In-flight bill creation idempotency map (client-side lock)
const pendingTransactions = new Set();

// --- SAVE CONFIRMED BILL (IDEMPOTENT + TRANSACTION SAFE) ---
export async function saveConfirmedBill(billData) {
  if (!billData || !billData.items || billData.items.length === 0) {
    throw new Error('Cannot save an empty bill.');
  }

  const transactionId = billData.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  if (pendingTransactions.has(transactionId)) {
    throw new Error('A transaction with this ID is already in progress.');
  }

  pendingTransactions.add(transactionId);

  try {
    const now = new Date();
    const dateKey = getTodayDateKey(now);
    const dateDisplay = formatDateDisplay(dateKey);
    const timeDisplay = formatTimeDisplay(now);

    const billNumber = billData.billNumber || await getNextBillNumber();
    
    const finalizedBill = {
      id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      transactionId: transactionId,
      billNumber: billNumber,
      items: billData.items || [],
      subtotal: Number(billData.subtotal) || 0,
      discount: Number(billData.discount) || 0,
      total: Number(billData.total) || 0,
      paymentMethod: billData.paymentMethod || 'CASH',
      cashGiven: billData.paymentMethod === 'CASH' && billData.cashGiven !== undefined ? Number(billData.cashGiven) : undefined,
      change: billData.paymentMethod === 'CASH' && billData.change !== undefined ? Number(billData.change) : undefined,
      customerName: billData.customerName || '',
      customerPhone: billData.customerPhone || '',
      dateKey: dateKey,
      date: dateDisplay,
      time: timeDisplay,
      timestamp: now.getTime(),
      createdAt: now.toISOString(),
    };

    // 1. Insert into Supabase PostgreSQL (Source of Truth)
    if (isSupabaseConfigured) {
      const { data: billRecord, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_number: finalizedBill.billNumber,
          subtotal: finalizedBill.subtotal,
          discount: finalizedBill.discount,
          total: finalizedBill.total,
          payment_method: finalizedBill.paymentMethod,
          cash_given: finalizedBill.cashGiven ?? null,
          change_given: finalizedBill.change ?? null,
          customer_name: finalizedBill.customerName || '',
          customer_phone: finalizedBill.customerPhone || '',
          bill_date: finalizedBill.dateKey,
        })
        .select()
        .single();

      if (billError) {
        logger.error('Storage', 'Failed to insert bill into Supabase', billError);
        throw new Error('Unable to save bill to database: ' + (billError.message || 'Database error'));
      }

      finalizedBill.id = billRecord.id;

      // 2. Insert line items
      if (finalizedBill.items && finalizedBill.items.length > 0) {
        const lineItems = finalizedBill.items.map(it => {
          const price = it.unitPrice || it.price || 0;
          return {
            bill_id: billRecord.id,
            menu_item_id: it.id?.startsWith('itm_') ? it.id : (it.itemId || null),
            item_name: it.itemName || it.name,
            unit_price: price,
            quantity: it.quantity || 1,
            item_total: price * (it.quantity || 1),
          };
        });

        const { error: itemsError } = await supabase.from('bill_items').insert(lineItems);
        if (itemsError) {
          logger.error('Storage', 'Failed to insert bill items into Supabase', itemsError);
          try {
            await supabase.from('bills').delete().eq('id', billRecord.id);
          } catch (rollbackErr) {
            logger.error('Storage', 'Rollback failed for orphan bill', rollbackErr);
          }
          throw new Error('Failed to save complete bill items.');
        }
      }
    }

    // 3. Update local cache ONLY AFTER successful database response
    const allBills = getAllBills();
    allBills.unshift(finalizedBill);
    saveBills(allBills);

    // 4. Update local Daily Summary
    updateDailySummary(dateKey, finalizedBill);

    return finalizedBill;
  } finally {
    pendingTransactions.delete(transactionId);
  }
}

// Fetch all bills from Supabase with line items
export async function fetchRemoteBills() {
  if (!isSupabaseConfigured) return getAllBills();
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && Array.isArray(data)) {
      const mapped = data
        .filter(b => !isTestBill(b))
        .map(b => ({
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

      // Rebuild & sync daily summaries directly from Supabase source of truth
      const syncedSummaries = {};
      mapped.forEach(b => {
        const dKey = b.dateKey;
        if (!syncedSummaries[dKey]) {
          syncedSummaries[dKey] = {
            dateKey: dKey,
            dateDisplay: formatDateDisplay(dKey),
            totalSales: 0,
            cashSales: 0,
            upiSales: 0,
            billCount: 0,
            itemCount: 0,
          };
        }
        syncedSummaries[dKey].totalSales += b.total;
        if (b.paymentMethod === 'CASH') {
          syncedSummaries[dKey].cashSales += b.total;
        } else {
          syncedSummaries[dKey].upiSales += b.total;
        }
        syncedSummaries[dKey].billCount += 1;
        syncedSummaries[dKey].itemCount += (b.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
      });
      saveDailySummaries(syncedSummaries);

      return mapped;
    }
  } catch (err) {
    logger.warn('Storage', 'Bills fetch failed, preserving existing state', err);
  }
  return getAllBills();
}

// Delete all bills and summary for a specific date (Explicit admin action only)
export async function deleteDateBills(dateKey) {
  if (!dateKey) return false;
  if (isSupabaseConfigured) {
    try {
      const { data: billsToDelete } = await supabase
        .from('bills')
        .select('id')
        .eq('bill_date', dateKey);

      if (billsToDelete && billsToDelete.length > 0) {
        const billIds = billsToDelete.map(b => b.id);
        await supabase.from('bill_items').delete().in('bill_id', billIds);
        await supabase.from('bills').delete().eq('bill_date', dateKey);
      }
    } catch (err) {
      logger.warn('Storage', 'Error deleting date bills from remote', err);
    }
  }

  // Remove from local cache
  const allBills = getAllBills().filter(b => b.dateKey !== dateKey);
  saveBills(allBills);

  const summaries = getAllDailySummaries();
  delete summaries[dateKey];
  saveDailySummaries(summaries);

  return true;
}

// Fetch daily sales summary directly from Supabase
export async function fetchRemoteDailySummary(dateKey = getTodayDateKey()) {
  if (!isSupabaseConfigured) return getTodaySummary();
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*, bill_items(*)')
      .eq('bill_date', dateKey);

    if (error) throw error;

    const validBills = (bills || []).filter(b => !isTestBill(b));
    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let billCount = validBills.length;
    let itemCount = 0;

    validBills.forEach(b => {
      const amt = Number(b.total) || 0;
      totalSales += amt;
      if (b.payment_method === 'CASH') {
        cashSales += amt;
      } else {
        upiSales += amt;
      }
      (b.bill_items || []).forEach(it => {
        itemCount += Number(it.quantity) || 1;
      });
    });

    const summary = {
      dateKey,
      dateDisplay: formatDateDisplay(dateKey),
      totalSales,
      cashSales,
      upiSales,
      billCount,
      itemCount,
      avgBill: billCount > 0 ? Math.round(totalSales / billCount) : 0,
    };

    const allSummaries = getAllDailySummaries();
    allSummaries[dateKey] = summary;
    saveDailySummaries(allSummaries);

    return summary;
  } catch (err) {
    logger.warn('Storage', 'Daily summary fetch failed, using local calculation', err);
    return getTodaySummary();
  }
}

// --- DAILY SUMMARIES LOCAL CACHE HELPERS ---
export function getAllDailySummaries() {
  return safeGetJSON(KEYS.DAILY_SUMMARIES, {});
}

export function saveDailySummaries(summaries) {
  if (summaries && typeof summaries === 'object') {
    safeSetJSON(KEYS.DAILY_SUMMARIES, summaries);
  }
}

function updateDailySummary(dateKey, bill) {
  if (isTestBill(bill)) return;
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
  
  const itemsInBill = (bill.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
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
  const defaultSettings = {
    selectedPrinter: 'Default System Printer',
    paperWidth: '80mm',
    shopName: 'EAT & DRINK',
    shopLocation: 'MANGALAGIRI',
    footerMessage: 'THANK YOU! VISIT AGAIN',
    autoPrint: false,
    soundEnabled: true,
  };
  const cached = safeGetJSON(KEYS.PRINTER_SETTINGS, null);
  if (!cached) return defaultSettings;
  return { ...defaultSettings, ...cached };
}

export function savePrinterSettings(settings) {
  if (settings && typeof settings === 'object') {
    safeSetJSON(KEYS.PRINTER_SETTINGS, settings);
  }
}

// --- RESET ALL BILLS (Admin Deliberate Action with Safety Guard) ---
export async function clearAllBillsAndResetSales(adminKey) {
  if (adminKey !== 'CONFIRM_ADMIN_RESET_2026') {
    logger.warn('Storage', 'Attempted unauthorized database reset blocked.');
    return false;
  }

  safeSetJSON(KEYS.BILLS, []);
  safeSetJSON(KEYS.DAILY_SUMMARIES, {});
  safeSetJSON(KEYS.LAST_BILL_SEQ, '0');

  if (isSupabaseConfigured) {
    try {
      await supabase.from('bill_items').delete().neq('item_name', '__non_existent__');
      await supabase.from('bills').delete().neq('bill_number', '__non_existent__');
    } catch (err) {
      logger.warn('Storage', 'Error truncating remote bills', err);
    }
  }

  return true;
}

// --- DATABASE BACKUP / RESTORE ---
export function exportFullDatabase() {
  return {
    version: '2.0 (Supabase Protected)',
    exportedAt: new Date().toISOString(),
    categories: getCategories(),
    items: getItems(),
    bills: getAllBills(),
    dailySummaries: getAllDailySummaries(),
    printerSettings: getPrinterSettings(),
    lastBillSeq: safeGetJSON(KEYS.LAST_BILL_SEQ, '29'),
  };
}

export function importFullDatabase(db) {
  if (!db || typeof db !== 'object') throw new Error('Invalid database JSON');
  if (db.categories) saveCategories(db.categories);
  if (db.items) saveItems(db.items);
  if (db.bills) saveBills(db.bills);
  if (db.dailySummaries) saveDailySummaries(db.dailySummaries);
  if (db.printerSettings) savePrinterSettings(db.printerSettings);
  if (db.lastBillSeq) safeSetJSON(KEYS.LAST_BILL_SEQ, String(db.lastBillSeq));
  return true;
}
