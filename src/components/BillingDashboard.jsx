import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  X, 
  Percent, 
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Receipt,
  Sparkles
} from 'lucide-react';
import { playBeep, playSuccess, playClear } from '../services/sound';

export default function BillingDashboard({ 
  categories, 
  items, 
  onConfirmBill, 
  soundEnabled 
}) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || 'cat_lassi');
  const [itemSearch, setItemSearch] = useState('');
  
  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'UPI'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [cashError, setCashError] = useState('');

  // Mobile Bottom Sheet Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  const searchInputRef = useRef(null);
  const categoryScrollRef = useRef(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    let list = items.filter(it => it.active !== false);
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      return list.filter(it => it.name.toLowerCase().includes(q));
    }
    return list.filter(it => it.categoryId === selectedCategory);
  }, [items, selectedCategory, itemSearch]);

  // In-cart quantity map for fast badges
  const cartQtyMap = useMemo(() => {
    const map = {};
    cartItems.forEach(it => {
      map[it.id] = it.quantity;
    });
    return map;
  }, [cartItems]);

  // Category counts map
  const categoryCounts = useMemo(() => {
    const map = {};
    items.forEach(it => {
      if (it.active !== false) {
        map[it.categoryId] = (map[it.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  // Horizontal category scroll helpers
  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Add item to cart
  const handleAddItem = (item) => {
    if (soundEnabled) playBeep();
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
        quantity: 1
      }];
    });
  };

  // Increment item
  const handleIncrement = (itemId) => {
    if (soundEnabled) playBeep();
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i));
  };

  // Decrement item
  const handleDecrement = (itemId) => {
    if (soundEnabled) playBeep();
    setCartItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  // Remove item
  const handleRemove = (itemId) => {
    if (soundEnabled) playClear();
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (soundEnabled) playClear();
    setCartItems([]);
    setDiscountValue(0);
    setCashTendered('');
    setCashError('');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * Math.min(100, Math.max(0, Number(discountValue) || 0))) / 100);
    }
    return Math.min(subtotal, Math.max(0, Number(discountValue) || 0));
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Cash change calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'CASH' || !cashTendered) return null;
    const tendered = Number(cashTendered) || 0;
    return tendered >= grandTotal ? tendered - grandTotal : null;
  }, [paymentMethod, cashTendered, grandTotal]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [cartItems]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Confirm Bill Action (Async with double-click protection)
  const handleConfirm = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    // Validate Cash Given if Cash payment is selected
    if (paymentMethod === 'CASH' && cashTendered !== '') {
      const tenderedNum = Number(cashTendered) || 0;
      if (tenderedNum < grandTotal) {
        setCashError(`Cash given (₹${tenderedNum}) is less than total bill (₹${grandTotal})`);
        return;
      }
    }
    setCashError('');
    setSubmitError('');

    const tenderedNum = paymentMethod === 'CASH' && cashTendered !== '' ? Number(cashTendered) : undefined;
    const changeAmt = tenderedNum !== undefined && tenderedNum >= grandTotal ? tenderedNum - grandTotal : undefined;

    const billPayload = {
      items: cartItems.map(it => ({
        itemId: it.id,
        itemName: it.name,
        quantity: it.quantity,
        unitPrice: it.price,
        total: it.price * it.quantity,
        categoryId: it.categoryId
      })),
      subtotal: subtotal,
      discount: discountAmount,
      total: grandTotal,
      paymentMethod: paymentMethod,
      cashGiven: tenderedNum,
      change: changeAmt,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim()
    };

    setIsSubmitting(true);
    try {
      await onConfirmBill(billPayload);

      if (soundEnabled) playSuccess();

      // Reset local billing state on SUCCESS only
      setCartItems([]);
      setDiscountValue(0);
      setCashTendered('');
      setCashError('');
      setCustomerName('');
      setCustomerPhone('');
      setIsMobileCartOpen(false);
    } catch (err) {
      setSubmitError('Unable to save bill. Please try again.');
      alert('Unable to save bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  // Shared Light Frosted Glass Cart Component
  const renderCartContent = (isDrawer = false) => (
    <div className="flex flex-col h-full overflow-hidden text-[#18202B]">
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D8E1EC]/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#FF5B4A] text-white flex items-center justify-center font-bold shadow-md shadow-[#FF5B4A]/20">
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#18202B] leading-tight uppercase tracking-wider">Active Bill</h2>
            <p className="text-[11px] text-[#697586] font-medium">
              {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in order
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full border border-rose-200/60 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
          {isDrawer && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1.5 rounded-full text-[#697586] hover:text-[#18202B] glass-pill"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Cart Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-1">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#98A2B3] py-12 text-center">
            <div className="w-12 h-12 rounded-2xl glass-inset flex items-center justify-center mb-3 text-[#98A2B3]">
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-[#697586]">Active Bill is Empty</p>
            <p className="text-[11px] text-[#98A2B3] mt-1 max-w-[200px]">
              Tap on any dish card to add items to this order
            </p>
          </div>
        ) : (
          cartItems.map(item => {
            const itemTotal = item.price * item.quantity;
            const catObj = categories.find(c => c.id === item.categoryId);

            return (
              <div 
                key={item.id}
                className="glass-inset rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-sm hover:border-[#FF5B4A]/40 transition-colors"
              >
                {/* Title & Unit Price */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="font-bold text-xs text-[#18202B] truncate leading-tight">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[#FF5B4A] font-semibold uppercase truncate">
                      {catObj?.name || ''}
                    </span>
                    <span className="text-[10px] text-[#98A2B3]">•</span>
                    <span className="text-[10px] text-[#697586] font-mono">
                      ₹{item.price} × {item.quantity} = <strong className="text-[#18202B]">₹{itemTotal}</strong>
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center bg-white/80 rounded-xl border border-[#D8E1EC] p-0.5 shrink-0 shadow-xs">
                  <button
                    onClick={() => handleDecrement(item.id)}
                    className="p-1 rounded-lg text-[#697586] hover:text-[#18202B] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-black text-xs text-[#18202B] font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleIncrement(item.id)}
                    className="p-1 rounded-lg text-[#697586] hover:text-[#18202B] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-[#98A2B3] hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                  title="Remove item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Calculations & Payment Controls */}
      <div className="pt-2.5 border-t border-[#D8E1EC]/60 space-y-2 shrink-0">
        
        {/* Quick Discount Selector */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#697586] font-semibold flex items-center gap-1 text-[11px]">
            <Percent className="w-3 h-3 text-[#FF5B4A]" /> Discount:
          </span>
          <div className="flex items-center gap-1">
            {[0, 5, 10, 20].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setDiscountType('percent');
                  setDiscountValue(pct);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  discountType === 'percent' && discountValue === pct
                    ? 'glass-pill-active font-black'
                    : 'glass-pill text-[#697586] hover:text-[#18202B]'
                }`}
              >
                {pct === 0 ? 'None' : `${pct}%`}
              </button>
            ))}
            <input
              type="number"
              placeholder="₹"
              value={discountType === 'amount' && discountValue > 0 ? discountValue : ''}
              onChange={(e) => {
                setDiscountType('amount');
                setDiscountValue(Math.max(0, Number(e.target.value) || 0));
              }}
              className="w-14 bg-white/80 border border-[#D8E1EC] rounded-lg px-2 py-0.5 text-right text-xs text-[#18202B] font-mono placeholder-[#98A2B3] focus:outline-none focus:border-[#FF5B4A]"
            />
          </div>
        </div>

        {/* Totals Summary Card */}
        <div className="glass-inset rounded-2xl p-2.5 space-y-1 text-xs">
          <div className="flex justify-between text-[#697586]">
            <span>Subtotal</span>
            <span className="font-bold text-[#18202B] font-mono">₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Discount Applied</span>
              <span className="font-bold font-mono">-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t border-[#D8E1EC]/60">
            <span className="text-xs font-black uppercase tracking-wider text-[#18202B]">GRAND TOTAL</span>
            <span className="text-xl font-black text-[#FF5B4A] font-mono tracking-tight">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#697586] block mb-1">
            Payment Method
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('CASH');
                setCashError('');
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'glass-pill-active shadow-md'
                  : 'glass-pill text-[#697586] hover:text-[#18202B]'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>CASH</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('UPI');
                setCashError('');
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                paymentMethod === 'UPI'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                  : 'glass-pill text-[#697586] hover:text-[#18202B]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>UPI / ONLINE</span>
            </button>
          </div>
        </div>

        {/* Cash Tendered & Change Calculation */}
        {paymentMethod === 'CASH' && grandTotal > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 glass-inset p-2 rounded-xl text-xs">
              <span className="text-[11px] text-[#697586] font-semibold shrink-0">Cash Given: ₹</span>
              <input
                type="number"
                placeholder="e.g. 500"
                value={cashTendered}
                onChange={(e) => {
                  setCashTendered(e.target.value);
                  setCashError('');
                }}
                className="w-24 bg-white border border-[#D8E1EC] rounded-lg px-2 py-1 text-[#18202B] font-mono font-bold text-xs focus:outline-none focus:border-[#FF5B4A]"
              />
              {changeDue !== null && (
                <span className="text-emerald-600 font-black ml-auto font-mono text-xs">
                  Change: ₹{changeDue.toFixed(2)}
                </span>
              )}
            </div>
            {cashError && (
              <p className="text-[10px] text-rose-600 font-bold px-1">{cashError}</p>
            )}
          </div>
        )}

        {/* Confirm Bill Button */}
        <button
          type="button"
          disabled={cartItems.length === 0 || isSubmitting}
          onClick={handleConfirm}
          className={`w-full py-3.5 px-4 rounded-full font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
            cartItems.length > 0 && !isSubmitting
              ? 'glass-btn-coral cursor-pointer'
              : 'bg-[#D8E1EC] text-[#98A2B3] cursor-not-allowed border border-[#D8E1EC]'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 stroke-[2.5] ${isSubmitting ? 'animate-spin' : ''}`} />
          <span>{isSubmitting ? 'SAVING TO SUPABASE...' : `CONFIRM BILL • ₹${grandTotal.toFixed(2)}`}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 grid grid-cols-12 gap-3.5 p-3.5 overflow-hidden select-none relative">
      
      {/* ---------------------------------------------------- */}
      {/* LEFT / MAIN: LIGHT FROSTED GLASS MENU ORDERING AREA */}
      {/* ---------------------------------------------------- */}
      <div className="col-span-12 lg:col-span-8 xl:col-span-8 flex flex-col overflow-hidden glass-surface rounded-[32px] p-4">
        
        {/* 1. Global Fast Search Bar (Frosted Glass Search Capsule) */}
        <div className="relative mb-3.5 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-4 text-[#697586] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes, burgers, shakes, waffles... (Press '/' to focus)"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full bg-white/70 border border-white/90 rounded-full pl-11 pr-10 py-2.5 text-xs sm:text-sm text-[#18202B] placeholder-[#98A2B3] focus:outline-none focus:border-[#FF5B4A] focus:ring-2 focus:ring-[#FF5B4A]/20 shadow-sm font-medium transition-all"
            />
            {itemSearch && (
              <button
                onClick={() => setItemSearch('')}
                className="absolute right-3.5 p-1 text-[#697586] hover:text-[#18202B] rounded-full glass-pill transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. HORIZONTAL CATEGORY NAVIGATION (Frosted Glass Pills) */}
        <div className="relative mb-3 shrink-0 flex items-center gap-2">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollCategories('left')}
            className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Category Chips Container */}
          <div 
            ref={categoryScrollRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto scroll-smooth py-1 px-1 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id && !itemSearch.trim();
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setItemSearch('');
                  }}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 shrink-0 ${
                    isSelected
                      ? 'glass-pill-active font-black scale-[1.02]'
                      : 'glass-pill font-bold'
                  }`}
                >
                  <span className="text-xs tracking-tight uppercase">{cat.name}</span>

                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-black/20 text-white font-black' : 'bg-[#D8E1EC]/60 text-[#697586]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollCategories('right')}
            className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Category Header Title & Filter Status */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D8E1EC]/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF5B4A]">
              {itemSearch.trim() ? `Search: "${itemSearch}"` : activeCategoryObj?.name || 'All Menu'}
            </span>
            <span className="text-[11px] text-[#697586] font-medium">
              ({filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'})
            </span>
          </div>

          <div className="text-[11px] text-[#98A2B3] font-medium hidden sm:block">
            Click card or <strong className="text-[#FF5B4A]">+ ADD</strong> to bill
          </div>
        </div>

        {/* 4. Menu Items Grid (Frosted Glass Cards — Pure Typography, Orange Price & Button) */}
        <div className="flex-1 overflow-y-auto pr-1 py-1">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#98A2B3] py-16 text-center">
              <ShoppingBag className="w-12 h-12 mb-3 text-[#D8E1EC] stroke-[1.5]" />
              <p className="text-sm font-bold text-[#697586]">No dishes found</p>
              <p className="text-xs text-[#98A2B3] mt-1">Try another category or search keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map(item => {
                const inCartQty = cartQtyMap[item.id] || 0;
                const catObj = categories.find(c => c.id === item.categoryId);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className={`group relative glass-surface-interactive rounded-[28px] p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 min-h-[115px] ${
                      inCartQty > 0
                        ? 'border-[#FF5B4A] ring-2 ring-[#FF5B4A]/30 shadow-md'
                        : ''
                    }`}
                  >
                    {/* In Cart Badge */}
                    {inCartQty > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#FF5B4A] text-white font-black text-xs flex items-center justify-center shadow-md shadow-[#FF5B4A]/40 animate-pop-in z-20">
                        {inCartQty}
                      </div>
                    )}

                    {/* Dish Title & Category */}
                    <div className="flex-1 flex flex-col justify-start">
                      <h3 className="font-black text-[#18202B] text-xs sm:text-sm leading-snug group-hover:text-[#FF5B4A] transition-colors line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-[#697586] font-bold uppercase mt-1 truncate tracking-wider">
                        {catObj?.name || ''}
                      </p>
                    </div>

                    {/* Bottom: Price in Coral & Add Button */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D8E1EC]/60">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs text-[#FF5B4A] font-bold">₹</span>
                        <span className="text-base font-black text-[#FF5B4A] font-mono">
                          {item.price}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(item);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition-all duration-150 active:scale-90 cursor-pointer ${
                          inCartQty > 0
                            ? 'glass-btn-coral'
                            : 'glass-pill text-[#18202B] hover:text-[#FF5B4A]'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>ADD</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* RIGHT: DESKTOP LIGHT FROSTED GLASS ACTIVE BILL / CART */}
      {/* ---------------------------------------------------- */}
      <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 glass-surface rounded-[32px] p-4.5 flex-col overflow-hidden">
        {renderCartContent(false)}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MOBILE FLOATING CART ACTION BAR                      */}
      {/* ---------------------------------------------------- */}
      <div className="lg:hidden col-span-12 fixed bottom-3 left-3 right-3 z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className={`w-full py-3.5 px-4 rounded-full flex items-center justify-between shadow-2xl transition-all active:scale-[0.98] cursor-pointer ${
            cartItems.length > 0
              ? 'glass-btn-coral font-black'
              : 'glass-surface font-bold'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              cartItems.length > 0 ? 'bg-black/20 text-white' : 'bg-[#D8E1EC] text-[#697586]'
            }`}>
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider font-black">
                {cartItems.length > 0 ? 'View Active Bill' : 'Cart Empty'}
              </div>
              <div className="text-[10px] opacity-80">
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in order
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-black font-mono">
              ₹{grandTotal.toFixed(2)}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </div>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MOBILE BOTTOM SHEET CART DRAWER                      */}
      {/* ---------------------------------------------------- */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-md">
          <div 
            className="flex-1 w-full"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="w-full glass-surface rounded-t-[36px] p-4 max-h-[85vh] flex flex-col shadow-2xl animate-pop-in border-t border-white/90">
            <div className="w-12 h-1 bg-[#D8E1EC] rounded-full mx-auto mb-3 shrink-0" />
            <div className="flex-1 overflow-hidden">
              {renderCartContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

