// Automated Verification Script for EAT & DRINK POS application (Supabase Integration)
import { INITIAL_CATEGORIES, INITIAL_ITEMS } from './src/data/initialMenu.js';
import { 
  getCategories, 
  getItems, 
  saveConfirmedBill, 
  getAllBills, 
  getTodaySummary, 
  getPrinterSettings,
  savePrinterSettings,
  resetMenuToDefault,
  clearAllBillsAndResetSales
} from './src/services/storage.js';
import { generateReceiptText } from './src/services/printer.js';

// Polyfill minimal localStorage for node environment
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('  EAT & DRINK POS - SUPABASE & TRANSACTION TEST SUITE');
  console.log('====================================================\n');

  // 1. Verify Menu Categories and Items Count
  console.log('[TEST 1] Verifying Menu Data Source of Truth...');
  console.log(`Total Categories: ${INITIAL_CATEGORIES.length} (Expected: 21)`);
  console.log(`Total Menu Items: ${INITIAL_ITEMS.length} (Expected: 85+)`);
  if (INITIAL_CATEGORIES.length !== 21) throw new Error(`Category count mismatch: ${INITIAL_CATEGORIES.length}`);
  if (INITIAL_ITEMS.length < 85) throw new Error(`Item count too low: ${INITIAL_ITEMS.length}`);
  console.log('? All 21 categories & items verified!\n');

  // 2. Clear / Reset to start cleanly from zero
  console.log('[TEST 2] Verifying Initial Clean State (?0)...');
  await clearAllBillsAndResetSales();
  const initialSummary = getTodaySummary();
  console.log('Today Summary:', initialSummary);
  if (initialSummary.totalSales !== 0 || initialSummary.billCount !== 0 || initialSummary.cashSales !== 0 || initialSummary.upiSales !== 0) {
    throw new Error('Initial sales must be 0');
  }
  console.log('? Clean zero sales state confirmed!\n');

  // 3. User Scenario Test: Fruit Lassi (?60) x 1 + Mango Lassi (?60) x 1 = ?120 (CASH)
  console.log('[TEST 3] Testing Bill Creation: Fruit Lassi (?60) + Mango Lassi (?60) = ?120 (CASH)...');
  const userBillPayload = {
    items: [
      { itemId: 'itm_las_2', itemName: 'Fruit Lassi', quantity: 1, unitPrice: 60, total: 60 },
      { itemId: 'itm_las_3', itemName: 'Mango Lassi', quantity: 1, unitPrice: 60, total: 60 }
    ],
    subtotal: 120,
    discount: 0,
    total: 120,
    paymentMethod: 'CASH',
    cashGiven: 120,
    change: 0,
    customerName: 'Walk-in'
  };

  const savedBill = await saveConfirmedBill(userBillPayload);
  console.log('Confirmed Bill Number:', savedBill.billNumber);
  console.log('Confirmed Bill Total: ?' + savedBill.total);
  if (savedBill.total !== 120) throw new Error(`Expected ₹120, got ${savedBill.total}`);
  if (!savedBill.billNumber.startsWith('#')) throw new Error(`Expected # sequence format, got ${savedBill.billNumber}`);

  const summaryAfterBill1 = getTodaySummary();
  console.log('Summary After Bill #000001:', summaryAfterBill1);
  if (summaryAfterBill1.totalSales !== 120) throw new Error(`Total sales mismatch: ${summaryAfterBill1.totalSales}`);
  if (summaryAfterBill1.cashSales !== 120) throw new Error(`Cash sales mismatch: ${summaryAfterBill1.cashSales}`);
  if (summaryAfterBill1.upiSales !== 0) throw new Error(`UPI sales should be 0, got ${summaryAfterBill1.upiSales}`);
  if (summaryAfterBill1.billCount !== 1) throw new Error(`Bill count mismatch: ${summaryAfterBill1.billCount}`);
  if (summaryAfterBill1.itemCount !== 2) throw new Error(`Item count mismatch: ${summaryAfterBill1.itemCount}`);
  console.log('? Bill #000001 confirmed and sales updated correctly!\n');

  // 4. Test Receipt Generation Consistency
  console.log('[TEST 4] Testing Canonical Receipt Layout Output...');
  const receipt80mm = generateReceiptText(savedBill, { paperWidth: '80mm', shopName: 'EAT & DRINK', shopLocation: 'MANGALAGIRI' });
  console.log('\n--- 80mm THERMAL RECEIPT ---');
  console.log(receipt80mm);
  if (!receipt80mm.includes(savedBill.billNumber)) throw new Error('Receipt missing bill number');
  if (!receipt80mm.includes('Fruit Lassi')) throw new Error('Receipt missing Fruit Lassi');
  if (!receipt80mm.includes('Mango Lassi')) throw new Error('Receipt missing Mango Lassi');
  if (!receipt80mm.includes('120.00')) throw new Error('Receipt missing 120.00');

  // 5. Test History & Reprint (Must NOT create duplicate bill or add sales)
  console.log('\n[TEST 5] Testing Bill History & Non-duplication on Reprint...');
  const billsInHistory = getAllBills();
  console.log(`History count: ${billsInHistory.length} (Expected: 1)`);
  if (billsInHistory.length !== 1) throw new Error(`Expected 1 bill in history, got ${billsInHistory.length}`);

  // Reprinting existing bill
  const reprintingBill = billsInHistory[0];
  const reprintedReceipt = generateReceiptText(reprintingBill, { paperWidth: '80mm' });
  if (reprintedReceipt !== receipt80mm) throw new Error('Reprint receipt does not match original!');

  // Verify sales did NOT increase
  const summaryAfterReprint = getTodaySummary();
  if (summaryAfterReprint.totalSales !== 120 || summaryAfterReprint.billCount !== 1) {
    throw new Error('Reprint corrupted sales totals!');
  }
  console.log('? Idempotent reprint verified! Sales remain strictly ?120 and 1 bill.\n');

  // 6. Clean reset after test
  await clearAllBillsAndResetSales();
  console.log('[TEST 6] Clean reset complete: Sales back to ?0, Bills back to 0.');
  console.log('\n====================================================');
  console.log('  ?? ALL SUPABASE & POS VALIDATION TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
