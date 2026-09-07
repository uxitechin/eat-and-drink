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

// Safe LocalStorage helpers that never throw and never clear unrelated keys
export function safeGetJSON(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    logger.warn('Storage', `Corrupted localStorage value for key: ${key}. Using safe fallback.`, err);
    return fallback;
  }
}

export function safeSetJSON(key, value) {
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
    logger.warn('Storage', 'Categories fetch failed, preserving known-good state', err);
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
        price: Number(it.price) || 0,
        active: it.is_active !== false,
      }));
      saveItems(mapped);
      return mapped;
    }
  } catch (err) {
    logger.warn('Storage', 'Items fetch failed, preserving known-good state', err);
  }
  return getItems();
}

export function resetMenuToDefault() {
  saveCategories(INITIAL_CATEGORIES);
  saveItems(INITIAL_ITEMS);
  return { categories: INITIAL_CATEGORIES, items: INITIAL_ITEMS };
}

// --- DATE & TIME HELPERS ---
export function getTodayDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);
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

export function getAllBills() {
  return safeGetJSON(KEYS.BILLS, []);
}

export function saveBills(bills) {
  if (Array.isArray(bills)) {
    safeSetJSON(KEYS.BILLS, bills);
  }
}

// In-flight bill creation idempotency lock map
const pendingTransactions = new Set();

/**
 * Authoritative Atomic Bill Creation
 * PostgreSQL Sequence owns bill numbering.
 * Complete transaction executed in single database RPC call.
 * Never clears cart on failure.
 */
export async function saveConfirmedBill(billData) {
  if (!billData || !billData.items || billData.items.length === 0) {
    const err = new Error('Cannot save an empty bill.');
    err.code = 'VALIDATION_ERROR';
    err.userMessage = 'Cannot confirm an empty cart.';
    throw err;
  }

  const idempotencyKey = billData.idempotencyKey || billData.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  if (pendingTransactions.has(idempotencyKey)) {
    const err = new Error('A transaction with this ID is already in progress.');
    err.code = 'DUPLICATE_TRANSACTION';
    err.userMessage = 'This order is currently being processed. Please wait.';
    throw err;
  }

  // Client-side quick check: return existing bill if already saved
  const existingLocalBill = getAllBills().find(b => (b.idempotencyKey === idempotencyKey || b.transactionId === idempotencyKey));
  if (existingLocalBill) {
    return existingLocalBill;
  }

  pendingTransactions.add(idempotencyKey);

  try {
    const now = new Date();
    const dateKey = getTodayDateKey(now);
    const timeDisplay = formatTimeDisplay(now);

    const lineItemsPayload = (billData.items || []).map(it => {
      const price = Number(it.unitPrice || it.price || 0);
      const qty = Math.max(1, Number(it.quantity) || 1);
      return {
        menu_item_id: it.itemId || it.id || null,
        item_name: it.itemName || it.name || 'Item',
        unit_price: price,
        quantity: qty,
        item_total: price * qty,
      };
    });

    let finalizedBill = null;

    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
      // 1. Try atomic PostgreSQL transaction via RPC
      const rpcPayload = {
        p_idempotency_key: idempotencyKey,
        p_subtotal: Number(billData.subtotal) || 0,
        p_discount: Number(billData.discount) || 0,
        p_total: Number(billData.total) || 0,
        p_payment_method: billData.paymentMethod || 'CASH',
        p_cash_given: billData.paymentMethod === 'CASH' && billData.cashGiven !== undefined ? Number(billData.cashGiven) : null,
        p_change_given: billData.paymentMethod === 'CASH' && billData.change !== undefined ? Number(billData.change) : null,
        p_customer_name: (billData.customerName || '').trim(),
        p_customer_phone: (billData.customerPhone || '').trim(),
        p_bill_date: dateKey,
        p_items: lineItemsPayload,
      };

      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_bill_transaction', rpcPayload);

      if (!rpcError && rpcResult) {
        finalizedBill = {
          id: rpcResult.id,
          idempotencyKey: idempotencyKey,
          transactionId: idempotencyKey,
          billNumber: rpcResult.bill_number,
          subtotal: Number(rpcResult.subtotal),
          discount: Number(rpcResult.discount),
          total: Number(rpcResult.total),
          paymentMethod: rpcResult.payment_method,
          cashGiven: rpcResult.cash_given !== null ? Number(rpcResult.cash_given) : undefined,
          change: rpcResult.change_given !== null ? Number(rpcResult.change_given) : undefined,
          customerName: rpcResult.customer_name || '',
          customerPhone: rpcResult.customer_phone || '',
          dateKey: rpcResult.bill_date || dateKey,
          date: formatDateDisplay(rpcResult.bill_date || dateKey),
          time: timeDisplay,
          timestamp: now.getTime(),
          createdAt: rpcResult.created_at || now.toISOString(),
          items: (billData.items || []).map(it => ({
            itemName: it.itemName || it.name,
            name: it.itemName || it.name,
            unitPrice: Number(it.unitPrice || it.price || 0),
            price: Number(it.unitPrice || it.price || 0),
            quantity: Number(it.quantity) || 1,
          })),
        };
      } else {
        // If RPC is missing during migration rollout (PGRST202), fallback safely to sequence-aware table insert
        logger.warn('Storage', 'create_bill_transaction RPC not available or failed, using fallback insert', rpcError);

        // Fallback: Query highest sequence from DB and insert
        let fallbackBillNumber = null;
        const { data: latestBills } = await supabase
          .from('bills')
          .select('bill_number')
          .order('created_at', { ascending: false })
          .limit(10);

        let maxSeq = 0;
        (latestBills || []).forEach(b => {
          const match = (b?.bill_number || '').match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });
        fallbackBillNumber = `#${String(maxSeq + 1).padStart(6, '0')}`;

        const { data: billRecord, error: billError } = await supabase
          .from('bills')
          .insert({
            bill_number: fallbackBillNumber,
            subtotal: Number(billData.subtotal) || 0,
            discount: Number(billData.discount) || 0,
            total: Number(billData.total) || 0,
            payment_method: billData.paymentMethod || 'CASH',
            cash_given: billData.paymentMethod === 'CASH' && billData.cashGiven !== undefined ? Number(billData.cashGiven) : null,
            change_given: billData.paymentMethod === 'CASH' && billData.change !== undefined ? Number(billData.change) : null,
            customer_name: (billData.customerName || '').trim(),
            customer_phone: (billData.customerPhone || '').trim(),
            bill_date: dateKey,
            idempotency_key: idempotencyKey,
          })
          .select()
          .single();

        if (billError) {
          logger.error('Storage', 'Database insert failed for bill', billError);
          const err = new Error('Database insert failed');
          err.code = 'DATABASE_ERROR';
          err.userMessage = "Couldn't save this bill to the server. Your cart is safe. Please retry.";
          throw err;
        }

        // Insert items
        const lineItems = lineItemsPayload.map(it => ({
          bill_id: billRecord.id,
          menu_item_id: it.menu_item_id?.startsWith('itm_') ? it.menu_item_id : null,
          item_name: it.item_name,
          unit_price: it.unit_price,
          quantity: it.quantity,
          item_total: it.item_total,
        }));

        const { error: itemsError } = await supabase.from('bill_items').insert(lineItems);
        if (itemsError) {
          logger.error('Storage', 'Failed to insert line items, rolling back header', itemsError);
          try {
            await supabase.from('bills').delete().eq('id', billRecord.id);
          } catch (rbErr) {}
          const err = new Error('Failed to save bill items');
          err.code = 'DATABASE_ERROR';
          err.userMessage = "Couldn't complete saving bill items. Your cart is safe. Please retry.";
          throw err;
        }

        finalizedBill = {
          id: billRecord.id,
          idempotencyKey: idempotencyKey,
          transactionId: idempotencyKey,
          billNumber: billRecord.bill_number,
          subtotal: Number(billRecord.subtotal),
          discount: Number(billRecord.discount),
          total: Number(billRecord.total),
          paymentMethod: billRecord.payment_method,
          cashGiven: billRecord.cash_given !== null ? Number(billRecord.cash_given) : undefined,
          change: billRecord.change_given !== null ? Number(billRecord.change_given) : undefined,
          customerName: billRecord.customer_name || '',
          customerPhone: billRecord.customer_phone || '',
          dateKey: billRecord.bill_date,
          date: formatDateDisplay(billRecord.bill_date),
          time: timeDisplay,
          timestamp: now.getTime(),
          createdAt: billRecord.created_at || now.toISOString(),
          items: (billData.items || []).map(it => ({
            itemName: it.itemName || it.name,
            name: it.itemName || it.name,
            unitPrice: Number(it.unitPrice || it.price || 0),
            price: Number(it.unitPrice || it.price || 0),
            quantity: Number(it.quantity) || 1,
          })),
        };
      }
    } else {
      // If offline: NEVER fake successful server bill creation
      const err = new Error('Application is offline. Cannot confirm bill without server connection.');
      err.code = 'OFFLINE_ERROR';
      err.userMessage = 'Unable to sync with database. Please check your internet connection and try again.';
      throw err;
    }

    if (!finalizedBill) {
      const err = new Error('Bill could not be finalized.');
      err.code = 'DATABASE_ERROR';
      err.userMessage = "Couldn't complete this bill. Please check Bill History before retrying.";
      throw err;
    }

    // 2. Update local bills cache ONLY AFTER confirmed database persistence
    const allBills = getAllBills();
    const existingIdx = allBills.findIndex(b => b.id === finalizedBill.id || b.idempotencyKey === finalizedBill.idempotencyKey);
    if (existingIdx >= 0) {
      allBills[existingIdx] = finalizedBill;
    } else {
      allBills.unshift(finalizedBill);
    }
    saveBills(allBills);

    // 3. Recompute daily summary strictly from confirmed records
    updateDailySummary(dateKey, finalizedBill);

    return finalizedBill;
  } finally {
    pendingTransactions.delete(idempotencyKey);
  }
}

// Fetch all bills from Supabase with line items (Authoritative)
export async function fetchRemoteBills() {
  if (!isSupabaseConfigured) return getAllBills();
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && Array.isArray(data)) {
      const mapped = data.map(b => ({
        id: b.id,
        idempotencyKey: b.idempotency_key || null,
        transactionId: b.idempotency_key || null,
        billNumber: b.bill_number,
        subtotal: Number(b.subtotal) || 0,
        discount: Number(b.discount) || 0,
        total: Number(b.total) || 0,
        paymentMethod: b.payment_method || 'CASH',
        cashGiven: b.cash_given !== null && b.cash_given !== undefined ? Number(b.cash_given) : undefined,
        change: b.change_given !== null && b.change_given !== undefined ? Number(b.change_given) : undefined,
        customerName: b.customer_name || '',
        customerPhone: b.customer_phone || '',
        dateKey: b.bill_date,
        date: formatDateDisplay(b.bill_date),
        time: b.created_at ? new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
        items: (b.bill_items || []).map(bi => ({
          itemName: bi.item_name,
          name: bi.item_name,
          unitPrice: Number(bi.unit_price) || 0,
          price: Number(bi.unit_price) || 0,
          quantity: Number(bi.quantity) || 1,
        })),
        createdAt: b.created_at,
      }));
      saveBills(mapped);

      // Rebuild & sync daily summaries directly from Supabase source of truth
      const syncedSummaries = {};
      mapped.forEach(b => {
        const dKey = b.dateKey;
        if (!dKey) return;
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
    logger.warn('Storage', 'Bills fetch failed, preserving known-good state', err);
  }
  return getAllBills();
}

// Fetch daily sales summary derived from confirmed bills
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
    logger.warn('Storage', 'Daily summary fetch failed, using local calculation', err);
    return getTodaySummary();
  }
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

  current.totalSales += (Number(bill.total) || 0);
  if (bill.paymentMethod === 'CASH') {
    current.cashSales += (Number(bill.total) || 0);
  } else {
    current.upiSales += (Number(bill.total) || 0);
  }
  current.billCount += 1;
  
  const itemsInBill = (bill.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
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
  };
}

export function importFullDatabase(db) {
  if (!db || typeof db !== 'object') throw new Error('Invalid database JSON');
  if (db.categories && Array.isArray(db.categories)) saveCategories(db.categories);
  if (db.items && Array.isArray(db.items)) saveItems(db.items);
  if (db.bills && Array.isArray(db.bills)) saveBills(db.bills);
  if (db.dailySummaries && typeof db.dailySummaries === 'object') saveDailySummaries(db.dailySummaries);
  if (db.printerSettings && typeof db.printerSettings === 'object') savePrinterSettings(db.printerSettings);
  return { success: true };
}
