import React, { useState, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Search, 
  X, 
  AlertTriangle,
  FolderPlus,
  Power
} from 'lucide-react';
import { saveCategories, saveItems, resetMenuToDefault } from '../services/storage';
import PrinterSettings from './PrinterSettings';

export default function MenuManagement({ 
  categories, 
  setCategories, 
  items, 
  setItems,
  printerSettings,
  setPrinterSettings,
  soundEnabled,
  setSoundEnabled,
  onTriggerPWAInstall,
  isAppInstalled
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('dishes'); // 'dishes' or 'printer'
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  
  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');

  // Confirmation for Reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Filtered items
  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCatId !== 'ALL') {
      list = list.filter(it => it.categoryId === selectedCatId);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(it => it.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, selectedCatId, searchTerm]);

  // Open New Item Modal
  const handleOpenNewItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemCategoryId(selectedCatId !== 'ALL' ? selectedCatId : (categories[0]?.id || 'cat_lassi'));
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategoryId(item.categoryId);
    setIsItemModalOpen(true);
  };

  // Save Item
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategoryId) return;

    const priceNum = Number(itemPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    if (editingItem) {
      const updated = items.map(it => 
        it.id === editingItem.id 
          ? { ...it, name: itemName.trim(), price: priceNum, categoryId: itemCategoryId }
          : it
      );
      setItems(updated);
      saveItems(updated);
    } else {
      const newItem = {
        id: 'itm_' + Date.now(),
        categoryId: itemCategoryId,
        name: itemName.trim(),
        price: priceNum,
        active: true
      };
      const updated = [...items, newItem];
      setItems(updated);
      saveItems(updated);
    }

    setIsItemModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      const updated = items.filter(it => it.id !== itemId);
      setItems(updated);
      saveItems(updated);
    }
  };

  // Toggle Item Active / Available status
  const handleToggleItemActive = (itemId) => {
    const updated = items.map(it => 
      it.id === itemId ? { ...it, active: it.active === false ? true : false } : it
    );
    setItems(updated);
    saveItems(updated);
  };

  // Save Category
  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      const updated = categories.map(c => 
        c.id === editingCategory.id ? { ...c, name: catName.trim() } : c
      );
      setCategories(updated);
      saveCategories(updated);
    } else {
      const newCat = {
        id: 'cat_' + Date.now(),
        name: catName.trim(),
        icon: 'Utensils',
        order: categories.length + 1
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      saveCategories(updated);
    }

    setIsCatModalOpen(false);
  };

  // Reset to default menu
  const handleResetToDefault = () => {
    const res = resetMenuToDefault();
    setCategories(res.categories);
    setItems(res.items);
    setShowResetConfirm(false);
  };

  return (
    <div className="flex-1 p-4 overflow-hidden flex flex-col space-y-3.5 max-w-7xl mx-auto w-full select-none">
      {/* Top Glass Bar with Navigation & Actions */}
      <div className="glass-surface p-4.5 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5B4A] text-white flex items-center justify-center shadow-md shadow-[#FF5B4A]/25">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#18202B]">Administration & Settings</h1>
              <div className="flex items-center bg-[#F3F6FA] p-0.5 rounded-full border border-[#D8E1EC]">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('dishes')}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                    activeAdminTab === 'dishes'
                      ? 'glass-pill-active font-black'
                      : 'text-[#697586] hover:text-[#18202B]'
                  }`}
                >
                  Dishes &amp; Menu
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('printer')}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                    activeAdminTab === 'printer'
                      ? 'glass-pill-active font-black'
                      : 'text-[#697586] hover:text-[#18202B]'
                  }`}
                >
                  Printer &amp; Hardware
                </button>
              </div>
            </div>
            <p className="text-xs text-[#697586] font-medium">
              {activeAdminTab === 'dishes' 
                ? 'Manage categories, dishes, prices, and in-stock statuses' 
                : 'Configure countertop thermal printer profiles, 58mm/80mm paper widths, and test prints'}
            </p>
          </div>
        </div>

        {activeAdminTab === 'dishes' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setIsCatModalOpen(true);
              }}
              className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-[#FF5B4A]" />
              <span>Add Category</span>
            </button>

            <button
              onClick={handleOpenNewItem}
              className="px-5 py-2 glass-btn-coral rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Dish Item</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 glass-pill hover:bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Restore Original 21 Categories & 86 Items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Menu</span>
            </button>
          </div>
        )}
      </div>

      {activeAdminTab === 'printer' ? (
        <div className="flex-1 overflow-y-auto">
          <PrinterSettings 
            settings={printerSettings}
            setSettings={setPrinterSettings}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onTriggerPWAInstall={onTriggerPWAInstall}
            isAppInstalled={isAppInstalled}
          />
        </div>
      ) : (
        <>
          {/* Category Pills & Search */}
          <div className="glass-surface p-4 rounded-[32px] space-y-2.5 shrink-0 shadow-sm">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-[#697586]" />
              <input
                type="text"
                placeholder="Search items to edit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/70 border border-white/90 rounded-full pl-9 pr-3 py-2 text-xs text-[#18202B] placeholder-[#98A2B3] focus:outline-none focus:border-[#FF5B4A] font-medium shadow-xs"
          />
        </div>

        {/* Category horizontal scrolling selector */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 pr-2 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCatId('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCatId === 'ALL'
                ? 'glass-pill-active font-black'
                : 'glass-pill text-[#18202B]'
            }`}
          >
            All Dishes ({items.length})
          </button>

          {categories.map(cat => {
            const count = items.filter(i => i.categoryId === cat.id).length;
            const isSelected = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'glass-pill-active font-black'
                    : 'glass-pill text-[#18202B]'
                }`}
              >
                <span className="uppercase">{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-[#D8E1EC]/60 text-[#697586]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="flex-1 glass-surface rounded-[32px] overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#E9EEF5] text-[#697586] uppercase font-black tracking-wider text-[10px] border-b border-[#D8E1EC] z-10">
              <tr>
                <th className="py-3.5 px-4">Dish Name</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Price</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E1EC]/50">
              {filteredItems.map(item => {
                const category = categories.find(c => c.id === item.categoryId);
                const isAvailable = item.active !== false;

                return (
                  <tr key={item.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#18202B]">
                      {item.name}
                    </td>

                    <td className="py-3 px-3 text-[#697586] font-semibold uppercase text-[11px]">
                      {category?.name || 'Unassigned'}
                    </td>

                    <td className="py-3 px-3 font-mono font-black text-[#FF5B4A] text-sm">
                      ₹{item.price}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleItemActive(item.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border transition-colors cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-[#98A2B3] border-stone-200'
                        }`}
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-2 glass-pill text-[#18202B] hover:text-[#FF5B4A] rounded-full transition-colors cursor-pointer shadow-xs"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 glass-pill hover:bg-rose-50 text-[#697586] hover:text-rose-600 rounded-full transition-colors cursor-pointer shadow-xs"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-surface rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-white/95">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E1EC]/60 mb-4">
              <h3 className="text-base font-bold text-[#18202B]">
                {editingItem ? 'Edit Dish Item' : 'Add New Dish Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-[#697586] hover:text-[#18202B] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#697586] uppercase mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mighty Zinger"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-white/80 border border-white/90 rounded-2xl p-2.5 text-sm text-[#18202B] font-medium focus:outline-none focus:border-[#FF5B4A] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#697586] uppercase mb-1">Category</label>
                <select
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  className="w-full bg-white/80 border border-white/90 rounded-2xl p-2.5 text-sm text-[#18202B] font-medium focus:outline-none focus:border-[#FF5B4A] shadow-inner"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#697586] uppercase mb-1">Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 130"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-white/80 border border-white/90 rounded-2xl p-2.5 text-sm text-[#18202B] font-mono font-bold focus:outline-none focus:border-[#FF5B4A] shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#D8E1EC]/60">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 glass-btn-coral text-white font-black rounded-full text-xs cursor-pointer shadow-md"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-surface rounded-[32px] max-w-sm w-full p-6 shadow-2xl border border-white/95">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#18202B]">Reset Default Menu?</h3>
            </div>
            <p className="text-xs text-[#697586] mb-4">
              This will restore all 21 categories and 86 original dishes from the official source of truth.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Reset Menu
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

