// Automated Verification Script for EAT & DRINK POS application
import { INITIAL_CATEGORIES, INITIAL_ITEMS } from './src/data/initialMenu.js';
import { 
  getCategories, 
  getItems, 
  saveConfirmedBill, 
  getAllBills, 
  getTodaySummary, 
  getPrinterSettings,
  savePrinterSettings,
  resetMenuToDefault
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

console.log('====================================================');
console.log('  EAT & DRINK POS - AUTOMATED TEST SUITE');
console.log('====================================================\n');

// 1. Verify Menu Categories and Items Count
console.log('[TEST 1] Verifying Menu Data Source of Truth...');
console.log(`Total Categories: ${INITIAL_CATEGORIES.length} (Expected: 21)`);
console.log(`Total Menu Items: ${INITIAL_ITEMS.length} (Expected: 85+)`);
if (INITIAL_CATEGORIES.length !== 21) throw new Error(`Category count mismatch: ${INITIAL_CATEGORIES.length}`);
if (INITIAL_ITEMS.length < 85) throw new Error(`Item count too low: ${INITIAL_ITEMS.length}`);

// Check specific required items from images
const requiredItems = [
  { name: 'Mighty Zinger', price: 130, cat: 'cat_burgers' },
  { name: 'Switch Lassi', price: 50, cat: 'cat_lassi' },
  { name: 'Belgian Chocolate', price: 110, cat: 'cat_waffles' },
  { name: 'Drak&White Fantasy', price: 120, cat: 'cat_double_chocolate' },
  { name: 'Tripple Cookie', price: 180, cat: 'cat_ice_cream_waff_wich' },
  { name: 'Chicken Pizza', price: 150, cat: 'cat_pizza' },
  { name: 'Chees Fry\'s', price: 90, cat: 'cat_french_fries' },
  { name: 'Turkish Frappe', price: 70, cat: 'cat_coffee_roster' },
  { name: 'Fruits Salad Ice cream', price: 80, cat: 'cat_fruits_ice_creams' },
  { name: 'Hard Rock Coffee', price: 60, cat: 'cat_cold_coffe' },
  { name: 'Missippi Mud', price: 90, cat: 'cat_super_shakes' },
  { name: 'Banana Bonkers', price: 60, cat: 'cat_shakes' },
  { name: 'Carmel Moch Fudge', price: 100, cat: 'cat_ice_cream_sundaes' },
  { name: 'Nutella Brownie', price: 130, cat: 'cat_brownies_ice_cream' },
  { name: 'Tropical Mixfruit', price: 70, cat: 'cat_fruit_cocktails' },
  { name: 'Vennella', price: 50, cat: 'cat_ice_cream_scoops' },
  { name: 'Black Current', price: 60, cat: 'cat_ice_cream_scoops' }
];

requiredItems.forEach(req => {
  const found = INITIAL_ITEMS.find(i => i.name === req.name && i.categoryId === req.cat);
  if (!found) throw new Error(`Missing item: ${req.name}`);
  if (found.price !== req.price) throw new Error(`Price mismatch for ${req.name}: expected ${req.price}, got ${found.price}`);
});
console.log('✓ All 21 categories & items exact matches verified!\n');

// 2. Test Initial Zero State
console.log('[TEST 2] Verifying Initial Clean State...');
const initialSummary = getTodaySummary();
console.log('Today Summary:', initialSummary);
if (initialSummary.totalSales !== 0 || initialSummary.billCount !== 0) {
  throw new Error('Initial sales should be 0');
}
console.log('✓ Clean zero sales state confirmed!\n');

// 3. Test CASH Bill Confirmation
console.log('[TEST 3] Testing Cash Bill Confirmation Flow...');
// Burger + Lassi
const cashBillPayload = {
  items: [
    { itemId: 'itm_brg_1', itemName: 'Mighty Zinger', quantity: 2, unitPrice: 130, total: 260 },
    { itemId: 'itm_las_3', itemName: 'Mango Lassi', quantity: 1, unitPrice: 60, total: 60 }
  ],
  subtotal: 320,
  discount: 20,
  total: 300,
  paymentMethod: 'CASH',
  customerName: 'Ravi Kumar',
  customerPhone: '9876543210'
};

const savedCashBill = saveConfirmedBill(cashBillPayload);
console.log('Saved Cash Bill:', savedCashBill.billNumber, 'Amount: ₹' + savedCashBill.total);
if (savedCashBill.billNumber !== '#000001') throw new Error(`Expected #000001, got ${savedCashBill.billNumber}`);

const summaryAfterCash = getTodaySummary();
console.log('Summary After Cash Bill:', summaryAfterCash);
if (summaryAfterCash.totalSales !== 300) throw new Error(`Total sales mismatch: ${summaryAfterCash.totalSales}`);
if (summaryAfterCash.cashSales !== 300) throw new Error(`Cash sales mismatch: ${summaryAfterCash.cashSales}`);
if (summaryAfterCash.upiSales !== 0) throw new Error(`UPI sales should be 0, got ${summaryAfterCash.upiSales}`);
if (summaryAfterCash.billCount !== 1) throw new Error(`Bill count mismatch: ${summaryAfterCash.billCount}`);
if (summaryAfterCash.itemCount !== 3) throw new Error(`Item count mismatch: ${summaryAfterCash.itemCount}`);
console.log('✓ Cash bill confirmed and sales tracked properly!\n');

// 4. Test UPI Bill Confirmation
console.log('[TEST 4] Testing UPI Bill Confirmation Flow...');
const upiBillPayload = {
  items: [
    { itemId: 'itm_piz_1', itemName: 'Chicken Pizza', quantity: 1, unitPrice: 150, total: 150 },
    { itemId: 'itm_waf_1', itemName: 'Belgian Chocolate', quantity: 2, unitPrice: 110, total: 220 }
  ],
  subtotal: 370,
  discount: 0,
  total: 370,
  paymentMethod: 'UPI',
  customerName: 'Anitha',
  customerPhone: '9123456780'
};

const savedUpiBill = saveConfirmedBill(upiBillPayload);
console.log('Saved UPI Bill:', savedUpiBill.billNumber, 'Amount: ₹' + savedUpiBill.total);
if (savedUpiBill.billNumber !== '#000002') throw new Error(`Expected #000002, got ${savedUpiBill.billNumber}`);

const summaryAfterUpi = getTodaySummary();
console.log('Summary After UPI Bill:', summaryAfterUpi);
if (summaryAfterUpi.totalSales !== 670) throw new Error(`Total sales mismatch: expected 670, got ${summaryAfterUpi.totalSales}`);
if (summaryAfterUpi.cashSales !== 300) throw new Error(`Cash sales mismatch: expected 300, got ${summaryAfterUpi.cashSales}`);
if (summaryAfterUpi.upiSales !== 370) throw new Error(`UPI sales mismatch: expected 370, got ${summaryAfterUpi.upiSales}`);
if (summaryAfterUpi.billCount !== 2) throw new Error(`Bill count mismatch: expected 2, got ${summaryAfterUpi.billCount}`);
if (summaryAfterUpi.itemCount !== 6) throw new Error(`Item count mismatch: expected 6, got ${summaryAfterUpi.itemCount}`);
console.log('✓ UPI bill confirmed and sales tracked separately!\n');

// 5. Test Thermal Receipt Layout (58mm & 80mm)
console.log('[TEST 5] Testing Thermal Receipt Formatting (58mm & 80mm)...');
const settings80 = { paperWidth: '80mm', shopName: 'EAT & DRINK', shopLocation: 'MANGALAGIRI', footerMessage: 'THANK YOU! VISIT AGAIN' };
const receipt80 = generateReceiptText(savedCashBill, settings80);
console.log('\n--- 80mm RECEIPT OUTPUT ---\n' + receipt80);

const settings58 = { paperWidth: '58mm', shopName: 'EAT & DRINK', shopLocation: 'MANGALAGIRI', footerMessage: 'THANK YOU! VISIT AGAIN' };
const receipt58 = generateReceiptText(savedCashBill, settings58);
console.log('\n--- 58mm RECEIPT OUTPUT ---\n' + receipt58);

if (!receipt80.includes('EAT & DRINK')) throw new Error('Receipt missing shop name');
if (!receipt80.includes('MANGALAGIRI')) throw new Error('Receipt missing location');
if (!receipt80.includes('Mighty Zinger')) throw new Error('Receipt missing item');
if (!receipt80.includes('₹300.00')) throw new Error('Receipt missing total amount');
console.log('✓ Thermal receipt templates generated cleanly!\n');

// 6. Test Bill History & Non-duplication
console.log('[TEST 6] Testing Bill History & Reprint Non-duplication...');
const allBills = getAllBills();
if (allBills.length !== 2) throw new Error(`Expected 2 bills in history, got ${allBills.length}`);
console.log(`History contains ${allBills.length} bills:`, allBills.map(b => `${b.billNumber} (₹${b.total}, ${b.paymentMethod})`).join(', '));

// Verify that reprinting or viewing doesn't modify sales count
const summaryBeforeReprint = getTodaySummary();
const receiptReprint = generateReceiptText(allBills[0], settings80);
const summaryAfterReprint = getTodaySummary();
if (summaryBeforeReprint.totalSales !== summaryAfterReprint.totalSales || summaryBeforeReprint.billCount !== summaryAfterReprint.billCount) {
  throw new Error('Reprinting or viewing must NOT modify sales totals!');
}
console.log('✓ Safe reprint verified! Sales count remains unaffected by printing.\n');

console.log('====================================================');
console.log('  🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
