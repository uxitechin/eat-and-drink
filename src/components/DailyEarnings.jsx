import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Banknote, 
  CreditCard, 
  Receipt, 
  ShoppingBag, 
  Calendar, 
  Download, 
  Clock, 
  Award,
  Sparkles,
  PieChart,
  RotateCcw
} from 'lucide-react';
import { 
  getAllBills, 
  getAllDailySummaries, 
  getTodayDateKey, 
  formatDateDisplay, 
  clearAllBillsAndResetSales,
  deleteDateBills 
} from '../services/storage';

export default function DailyEarnings({ todaySummary }) {
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey());
  const allSummaries = getAllDailySummaries();
  const allBills = getAllBills();

  const activeSummary = useMemo(() => {
    if (selectedDateKey === getTodayDateKey()) {
      return todaySummary || {
        totalSales: 0,
        cashSales: 0,
        upiSales: 0,
        billCount: 0,
        itemCount: 0
      };
    }
    return allSummaries[selectedDateKey] || {
      totalSales: 0,
      cashSales: 0,
      upiSales: 0,
      billCount: 0,
      itemCount: 0
    };
  }, [selectedDateKey, todaySummary, allSummaries]);

  const dayBills = useMemo(() => {
    return allBills.filter(b => b.dateKey === selectedDateKey);
  }, [allBills, selectedDateKey]);

  const averageBill = useMemo(() => {
    if (!activeSummary.billCount || activeSummary.billCount === 0) return 0;
    return Math.round(activeSummary.totalSales / activeSummary.billCount);
  }, [activeSummary]);

  const topItems = useMemo(() => {
    const map = {};
    dayBills.forEach(bill => {
      (bill.items || []).forEach(it => {
        const name = it.itemName || it.name;
        if (!map[name]) {
          map[name] = { name, quantity: 0, revenue: 0 };
        }
        map[name].quantity += it.quantity;
        map[name].revenue += (it.unitPrice || it.price) * it.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  }, [dayBills]);

  const availableDates = useMemo(() => {
    const set = new Set(Object.keys(allSummaries));
    set.add(getTodayDateKey());
    return Array.from(set).sort().reverse();
  }, [allSummaries]);

  const totalSales = activeSummary.totalSales || 0;
  const cashPct = totalSales > 0 ? Math.round((activeSummary.cashSales / totalSales) * 100) : 50;
  const upiPct = totalSales > 0 ? 100 - cashPct : 50;

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Bill No', 'Time', 'Customer', 'Items Count', 'Payment Method', 'Subtotal', 'Discount', 'Total'],
      ...dayBills.map(b => [
        b.date,
        b.billNumber,
        b.time,
        b.customerName || 'Walk-in',
        b.items.reduce((s, i) => s + i.quantity, 0),
        b.paymentMethod,
        b.subtotal,
        b.discount,
        b.total
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EatAndDrink_Sales_${selectedDateKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetAllSales = async () => {
    if (window.confirm('Are you sure you want to reset all bills and start sales from ₹0?')) {
      await clearAllBillsAndResetSales();
      window.location.reload();
    }
  };

  const handleDeleteCurrentDate = async () => {
    if (window.confirm(`Are you sure you want to delete all recorded data for ${formatDateDisplay(selectedDateKey)}?`)) {
      await deleteDateBills(selectedDateKey);
      setSelectedDateKey(getTodayDateKey());
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full select-none">
      
      {/* Top Header Bar */}
      <div className="glass-surface p-4.5 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5B4A] text-white flex items-center justify-center shadow-md shadow-[#FF5B4A]/25">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#18202B]">Daily Earnings & Performance</h1>
            <p className="text-xs text-[#697586] font-medium">
              {selectedDateKey === getTodayDateKey() ? "Viewing Today's Live Sales" : `Viewing Historical Date: ${formatDateDisplay(selectedDateKey)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDateKey}
            onChange={(e) => setSelectedDateKey(e.target.value)}
            className="glass-pill text-[#18202B] text-xs font-bold rounded-full px-4 py-2 focus:outline-none focus:border-[#FF5B4A]"
          >
            {availableDates.map(d => (
              <option key={d} value={d}>
                {d === getTodayDateKey() ? `Today (${formatDateDisplay(d)})` : formatDateDisplay(d)}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#FF5B4A]" />
            <span>Export CSV</span>
          </button>

          {selectedDateKey !== getTodayDateKey() && (
            <button
              onClick={handleDeleteCurrentDate}
              className="px-4 py-2 glass-pill hover:bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={`Delete all bills and summary for ${formatDateDisplay(selectedDateKey)}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Delete {formatDateDisplay(selectedDateKey)} Data</span>
            </button>
          )}

          <button
            onClick={handleResetAllSales}
            className="px-4 py-2 glass-pill hover:bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Clear all test bills and reset revenue counters to ₹0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to ₹0</span>
          </button>
        </div>
      </div>

      {/* Floating Smartphone-Style KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Sales */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-[#697586] uppercase tracking-wider">Total Sales</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#FF5B4A] font-mono">
              ₹{(activeSummary.totalSales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-[#697586] mt-1">Confirmed revenue</span>
        </div>

        {/* Total Bills */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-[#697586] uppercase tracking-wider">Total Bills</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#18202B] font-mono">{activeSummary.billCount || 0}</span>
            <span className="text-xs text-[#697586] font-semibold">orders</span>
          </div>
          <span className="text-[10px] text-[#697586] mt-1">Completed bills</span>
        </div>

        {/* Cash Sales */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash Sales
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              ₹{(activeSummary.cashSales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 mt-1">{totalSales > 0 ? cashPct : 0}% of total</span>
        </div>

        {/* UPI Sales */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-sky-600" /> UPI / Online
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-sky-600 font-mono">
              ₹{(activeSummary.upiSales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-sky-700 mt-1">{totalSales > 0 ? upiPct : 0}% of total</span>
        </div>

        {/* Average Bill */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-[#697586] uppercase tracking-wider">Avg Bill Value</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#18202B] font-mono">
              ₹{averageBill.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-[#697586] mt-1">Per customer</span>
        </div>

        {/* Items Sold */}
        <div className="glass-surface p-4 rounded-[28px] flex flex-col justify-between border border-white/95 shadow-md">
          <span className="text-[10px] font-bold text-[#697586] uppercase tracking-wider">Items Sold</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#FF5B4A] font-mono">{activeSummary.itemCount || 0}</span>
            <span className="text-xs text-[#697586] font-semibold">units</span>
          </div>
          <span className="text-[10px] text-[#697586] mt-1">Total quantity</span>
        </div>
      </div>

      {/* Payment Split & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Payment Split (5 cols) */}
        <div className="lg:col-span-5 glass-surface p-5 rounded-[32px] flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-[#18202B] mb-3 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-[#FF5B4A]" />
              <span>Payment Distribution</span>
            </h3>

            {/* Split Bar */}
            <div className="h-4 w-full bg-[#D8E1EC]/60 rounded-full overflow-hidden flex p-0.5 shadow-inner mb-4">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${totalSales > 0 ? cashPct : 50}%` }}
                title={`Cash: ${cashPct}%`}
              />
              <div 
                className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${totalSales > 0 ? upiPct : 50}%` }}
                title={`UPI: ${upiPct}%`}
              />
            </div>

            {/* Metric Rows */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 glass-inset rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#18202B]">Cash Counter</span>
                </div>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-emerald-700">₹{(activeSummary.cashSales || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-[#697586] px-2 py-0.5 rounded-full bg-white/80">{totalSales > 0 ? cashPct : 0}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 glass-inset rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="font-bold text-[#18202B]">UPI & Online QR</span>
                </div>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-sky-700">₹{(activeSummary.upiSales || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-[#697586] px-2 py-0.5 rounded-full bg-white/80">{totalSales > 0 ? upiPct : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3.5 glass-pill rounded-2xl text-[11px] text-[#697586] flex items-center justify-between">
            <span>Location: <strong className="text-[#18202B]">MANGALAGIRI</strong></span>
            <span>Shop: <strong className="text-[#FF5B4A]">EAT & DRINK</strong></span>
          </div>
        </div>

        {/* Top Selling Dishes Ranking (7 cols) */}
        <div className="lg:col-span-7 glass-surface rounded-[32px] p-5 flex flex-col shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#D8E1EC]/60 mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#18202B] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FF5B4A]" />
              <span>Top Selling Dishes ({formatDateDisplay(selectedDateKey)})</span>
            </h2>
            <span className="text-[10px] font-bold text-[#697586]">
              {topItems.length} unique items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[260px]">
            {topItems.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[#98A2B3]">
                <Award className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-bold text-[#697586]">No sales recorded for this date yet</p>
              </div>
            ) : (
              topItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 glass-inset rounded-2xl hover:border-[#FF5B4A]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#FF5B4A]/10 text-[#FF5B4A] font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-xs text-[#18202B]">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-bold text-[#697586] font-mono">{item.quantity} sold</span>
                    <span className="font-black text-[#FF5B4A] font-mono w-20 text-right">
                      ₹{item.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
