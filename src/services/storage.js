import { INITIAL_CATEGORIES, INITIAL_ITEMS } from '../data/initialMenu.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const KEYS = {
  CATEGORIES: 'eat_drink_categories',
  ITEMS: 'eat_drink_items',
  BILLS: 'eat_drink_bills',
  DAILY_SUMMARIES: 'eat_drink_daily_summaries',
  PRINTER_SETTINGS: 'eat_drink_printer_settings',
  LAST_BILL_SEQ: 'eat_drink_last_bill_seq',
};

// --- MENU DATA (SUPABASE PRIMARY + LOCAL FALLBACK) ---

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

// --- RELIABLE SEQUENTIAL BILL NUMBERING ---
export async function getNextBillNumber() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].bill_number) {
        const match = data[0].bill_number.match(/\d+/);
        if (match) {
          const nextSeq = parseInt(match[0], 10) + 1;
          return `#${String(nextSeq).padStart(6, '0')}`;
        }
      }
      return '#000001';
    } catch (e) {
      console.warn('[Supabase] Error getting next bill number from Supabase:', e);
    }
  }

  // Fallback to local sequence
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

// --- SAVE CONFIRMED BILL (SUPABASE TRANSACTION + ATOMIC LINE ITEMS) ---
export async function saveConfirmedBill(billData) {
  const now = new Date();
  const dateKey = getTodayDateKey(now);
  const dateDisplay = formatDateDisplay(dateKey);
  const timeDisplay = formatTimeDisplay(now);

  const billNumber = billData.billNumber || await getNextBillNumber();
  
  const finalizedBill = {
    id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
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
    try {
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

      if (billError) throw billError;

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
        if (itemsError) throw itemsError;
      }
    } catch (err) {
      console.error('[Supabase] Failed to save bill:', err);
      throw new Error('Unable to save bill. Please try again.');
    }
  }

  // 3. Update local cache for instant fast UI responsiveness
  const allBills = getAllBills();
  allBills.unshift(finalizedBill);
  saveBills(allBills);

  // 4. Update local Daily Summary
  updateDailySummary(dateKey, finalizedBill);

  return finalizedBill;
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
    console.warn('[Supabase] Bills fetch error, using local fallback:', err.message);
  }
  return getAllBills();
}

// Delete all bills and summary for a specific date (e.g. 2026-08-30)
export async function deleteDateBills(dateKey) {
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
      console.warn('[Supabase] Error deleting date bills:', err.message);
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

    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let billCount = bills?.length || 0;
    let itemCount = 0;

    (bills || []).forEach(b => {
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
    console.warn('[Supabase] Daily summary fetch error, using local calculation:', err.message);
    return getTodaySummary();
  }
}

// --- DAILY SUMMARIES LOCAL CACHE HELPERS ---
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
    version: '2.0 (Supabase Powered)',
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
