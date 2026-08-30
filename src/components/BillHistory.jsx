import React, { useState, useMemo } from 'react';
import { 
  Search, 
  History, 
  Printer, 
  Eye, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Download, 
  FileText
} from 'lucide-react';
import { getAllBills, formatDateDisplay } from '../services/storage';

export default function BillHistory({ onSelectBillForPreview, onPrintBill }) {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // 'ALL', 'CASH', 'UPI'
  const [dateFilter, setDateFilter] = useState('');
  
  const allBills = getAllBills();

  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (paymentFilter !== 'ALL' && bill.paymentMethod !== paymentFilter) {
        return false;
      }
      if (dateFilter && bill.dateKey !== dateFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesBillNo = bill.billNumber.toLowerCase().includes(q);
        const matchesCustomer = (bill.customerName || '').toLowerCase().includes(q);
        const matchesItem = (bill.items || []).some(it => 
          (it.itemName || it.name || '').toLowerCase().includes(q)
        );
        return matchesBillNo || matchesCustomer || matchesItem;
      }
      return true;
    });
  }, [allBills, search, paymentFilter, dateFilter]);

  const handleExportCSV = () => {
    const rows = [
      ['Bill No', 'Date', 'Time', 'Payment Method', 'Items Count', 'Subtotal', 'Discount', 'Total'],
      ...filteredBills.map(b => [
        b.billNumber,
        b.date,
        b.time,
        b.paymentMethod,
        b.items.reduce((s, i) => s + i.quantity, 0),
        b.subtotal,
        b.discount,
        b.total
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EatAndDrink_Bills_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-4 overflow-hidden flex flex-col space-y-3.5 max-w-7xl mx-auto w-full select-none">
      {/* Top Search & Filters */}
      <div className="glass-surface p-4.5 rounded-[32px] space-y-3 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5B4A] text-white flex items-center justify-center shadow-md shadow-[#FF5B4A]/25">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-[#18202B]">Bill History & Receipts</h1>
              <p className="text-xs text-[#697586] font-medium">
                Found {filteredBills.length} recorded {filteredBills.length === 1 ? 'bill' : 'bills'}
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <Download className="w-4 h-4 text-[#FF5B4A]" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#D8E1EC]/60">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#697586]" />
            <input
              type="text"
              placeholder="Search Bill No (#000001) or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/70 border border-white/90 rounded-full pl-9 pr-3 py-2 text-xs text-[#18202B] placeholder-[#98A2B3] focus:outline-none focus:border-[#FF5B4A] font-medium shadow-xs"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center bg-[#F3F6FA] p-1 rounded-full text-xs border border-[#D8E1EC]">
            {['ALL', 'CASH', 'UPI'].map(mode => (
              <button
                key={mode}
                onClick={() => setPaymentFilter(mode)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  paymentFilter === mode
                    ? 'glass-pill-active font-black'
                    : 'text-[#697586] hover:text-[#18202B] mx-0.5'
                }`}
              >
                {mode === 'ALL' ? 'All Payments' : mode}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-white/70 border border-white/90 text-[#18202B] text-xs font-bold rounded-full px-4 py-2 focus:outline-none focus:border-[#FF5B4A] cursor-pointer shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Bills Table Container */}
      <div className="flex-1 glass-surface rounded-[32px] overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto">
          {filteredBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#98A2B3] p-12 text-center">
              <FileText className="w-12 h-12 mb-3 text-[#D8E1EC] stroke-[1.5]" />
              <p className="text-sm font-bold text-[#697586]">No bills found</p>
              <p className="text-xs text-[#98A2B3] mt-1">Confirmed bills will automatically appear here</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#E9EEF5] text-[#697586] uppercase font-black tracking-wider text-[10px] border-b border-[#D8E1EC] z-10">
                <tr>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-3">Date & Time</th>
                  <th className="py-3.5 px-3">Items Ordered</th>
                  <th className="py-3.5 px-3">Payment</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E1EC]/50">
                {filteredBills.map((bill) => {
                  const totalItemsCount = (bill.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
                  const isCash = bill.paymentMethod === 'CASH';

                  return (
                    <tr 
                      key={bill.id}
                      className="hover:bg-white/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-[#FF5B4A] text-sm">
                        {bill.billNumber}
                      </td>

                      <td className="py-3.5 px-3 text-[#18202B]">
                        <div className="font-bold text-[#18202B]">{bill.date}</div>
                        <div className="text-[11px] text-[#697586] font-mono">{bill.time}</div>
                      </td>

                      <td className="py-3.5 px-3 text-[#18202B] max-w-[280px]">
                        <div className="font-bold text-[#18202B] truncate">
                          {(bill.items || []).map(it => `${it.itemName || it.name} (${it.quantity})`).join(', ')}
                        </div>
                        <div className="text-[10px] text-[#697586] font-medium">
                          {totalItemsCount} total {totalItemsCount === 1 ? 'item' : 'items'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                          isCash 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-sky-50 text-sky-800 border-sky-300'
                        }`}>
                          {isCash ? <Banknote className="w-3 h-3 text-emerald-600" /> : <CreditCard className="w-3 h-3 text-sky-600" />}
                          <span>{bill.paymentMethod}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-[#18202B] text-sm">
                        ₹{Number(bill.total || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onSelectBillForPreview(bill)}
                            className="px-3 py-1.5 glass-pill hover:glass-pill-active text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => onPrintBill(bill)}
                            className="px-3 py-1.5 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="Print Receipt Again"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#FF5B4A]" />
                            <span className="hidden sm:inline">Print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

