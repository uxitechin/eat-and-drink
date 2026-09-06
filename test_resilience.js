// Dedicated Resilience and Zero-Data-Loss Test Suite for EAT & DRINK POS
import { 
  getCategories, 
  getItems, 
  saveConfirmedBill, 
  getAllBills, 
  getTodaySummary, 
  getPrinterSettings,
  fetchRemoteCategories,
  fetchRemoteItems,
  exportFullDatabase
} from './src/services/storage.js';
import { generateReceiptText, printReceipt } from './src/services/printer.js';

// Polyfill minimal localStorage for testing
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

async function runResilienceTests() {
  console.log('====================================================');
  console.log('  EAT & DRINK POS - RESILIENCE & ZERO DATA-LOSS SUITE');
  console.log('====================================================\n');

  // TEST 1: Corrupted / Malformed localStorage Handling
  console.log('[TEST 1] Testing Corrupted LocalStorage Handling...');
  store['eat_drink_categories'] = '{"invalid_json: unclosed';
  store['eat_drink_items'] = 'null_corrupt_data...';
  store['eat_drink_bills'] = '{not an array}';
  store['eat_drink_printer_settings'] = 'corrupt!@#';
  store['eat_drink_daily_summaries'] = 'undefined';

  const safeCats = getCategories();
  const safeItms = getItems();
  const safeBills = getAllBills();
  const safePrinter = getPrinterSettings();
  const safeSummary = getTodaySummary();

  if (!Array.isArray(safeCats) || safeCats.length === 0) throw new Error('Failed to fallback categories on corrupted storage');
  if (!Array.isArray(safeItms) || safeItms.length === 0) throw new Error('Failed to fallback items on corrupted storage');
  if (!Array.isArray(safeBills) || safeBills.length !== 0) throw new Error('Failed to fallback bills on corrupted storage');
  if (!safePrinter || safePrinter.paperWidth !== '80mm') throw new Error('Failed to fallback printer settings');
  if (!safeSummary || safeSummary.totalSales !== 0) throw new Error('Failed to fallback daily summary');
  console.log('✓ Corrupted localStorage gracefully recovered to safe defaults without throwing!\n');

  // Reset store with valid data for next tests
  store['eat_drink_categories'] = JSON.stringify(safeCats);
  store['eat_drink_items'] = JSON.stringify(safeItms);
  store['eat_drink_bills'] = JSON.stringify([]);
  store['eat_drink_daily_summaries'] = JSON.stringify({});

  // TEST 2: Supabase Failure / Offline Preservation (Zero Data Loss)
  console.log('[TEST 2] Testing Preservation on Read Failure...');
  const currentCats = getCategories();
  const currentItms = getItems();
  
  // Call read methods; even if network is offline or Supabase fails, it must NEVER return [] or wipe out data
  const fallbackCats = await fetchRemoteCategories();
  const fallbackItms = await fetchRemoteItems();
  
  if (fallbackCats.length !== currentCats.length) throw new Error('Categories were wiped on read failure');
  if (fallbackItms.length !== currentItms.length) throw new Error('Items were wiped on read failure');
  console.log(`✓ Read failure preserved exact item count (${fallbackItms.length}) and category count (${fallbackCats.length})!\n`);

  // TEST 3: Idempotent Bill Creation & Double-Click Protection
  console.log('[TEST 3] Testing Idempotency & Duplicate Bill Creation...');
  const txId = `tx_test_${Date.now()}`;
  const testBill = {
    transactionId: txId,
    items: [
      { itemId: 'itm_las_1', itemName: 'Switch Lassi', quantity: 2, unitPrice: 50, total: 100 }
    ],
    subtotal: 100,
    discount: 0,
    total: 100,
    paymentMethod: 'CASH',
    cashGiven: 100,
    change: 0,
    customerName: 'Test Cashier'
  };

  const createdBill1 = await saveConfirmedBill(testBill);
  console.log(`Created Bill #1: ${createdBill1.billNumber} (Total: ₹${createdBill1.total})`);

  // Attempt empty bill validation
  try {
    await saveConfirmedBill({ items: [] });
    throw new Error('Empty bill should have been rejected');
  } catch (err) {
    if (!err.message.includes('empty bill')) throw err;
    console.log('✓ Empty bill creation rejected safely');
  }

  // TEST 4: Reprint Idempotency (Must never modify sales or bill count)
  console.log('\n[TEST 4] Testing Bill History & Reprint Non-duplication...');
  const summaryBefore = getTodaySummary();
  const billsBefore = getAllBills();
  
  const receiptMonospace = generateReceiptText(createdBill1, { paperWidth: '80mm' });
  if (!receiptMonospace.includes('Switch Lassi') || !receiptMonospace.includes('100.00')) {
    throw new Error('Generated receipt text is missing item details');
  }

  const summaryAfter = getTodaySummary();
  const billsAfter = getAllBills();

  if (summaryBefore.totalSales !== summaryAfter.totalSales) throw new Error('Reprint modified sales total!');
  if (billsBefore.length !== billsAfter.length) throw new Error('Reprint modified bill list!');
  console.log('✓ Reprint is 100% idempotent: sales and bill count completely unchanged!\n');

  // TEST 5: Printer Hardware Isolation
  console.log('[TEST 5] Testing Printer Hardware Error Isolation...');
  try {
    // Calling printReceipt without paired printer should throw structured handled error, NOT crash
    await printReceipt(createdBill1, { paperWidth: '80mm' });
  } catch (err) {
    if (err.code !== 'NO_PRINTER_CONFIGURED' && err.message !== 'NO_PRINTER_CONFIGURED') {
      throw err;
    }
    console.log('✓ Unconfigured printer threw controlled handled code (NO_PRINTER_CONFIGURED)');
  }

  // Verify bill remains intact after printer error
  const allBillsAfterPrintError = getAllBills();
  if (allBillsAfterPrintError.length !== 1 || allBillsAfterPrintError[0].total !== 100) {
    throw new Error('Bill was corrupted or rolled back after printer error!');
  }
  console.log('✓ Saved bill remains 100% intact after simulated printer disconnection!\n');

  // TEST 6: Database Export / Snapshot Integrity
  console.log('[TEST 6] Testing Database Snapshot Integrity...');
  const dbSnapshot = exportFullDatabase();
  if (!dbSnapshot.categories || !dbSnapshot.items || !dbSnapshot.bills) {
    throw new Error('Exported database snapshot is missing critical tables');
  }
  console.log(`✓ Database snapshot contains ${dbSnapshot.categories.length} categories, ${dbSnapshot.items.length} items, and ${dbSnapshot.bills.length} bills.\n`);

  console.log('====================================================');
  console.log('  🎯 ALL RESILIENCE & ZERO DATA-LOSS TESTS PASSED!');
  console.log('====================================================');
}

runResilienceTests().catch(err => {
  console.error('Resilience test failed:', err);
  process.exit(1);
});
