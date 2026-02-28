import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../firebase/config';
import { AuthContext } from '../../contexts/AuthContext';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  Search, Plus, Eye, Ban, X, Loader, Package, PackagePlus, PlusCircle, MinusCircle, Check, AlertTriangle,
} from 'lucide-react';

const emptyStockRow = { productId: '', productName: '', sku: '', currentStock: 0, addQty: 0, costPerUnit: 0 };

export default function Inventory() {
  const { userRole } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    price: '',
    stock: '',
    minStock: '',
    status: 'Active',
  });

  // View modal editable fields
  const [viewPrice, setViewPrice] = useState('');
  const [viewMinStock, setViewMinStock] = useState('');
  const [viewStatus, setViewStatus] = useState('Active');

  // Add Stock state
  const [stockRows, setStockRows] = useState([{ ...emptyStockRow }]);
  const [stockNote, setStockNote] = useState('');
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockSupplier, setStockSupplier] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockSuccess, setStockSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchSuppliers();
  }, []);

  // ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowForm(false);
        setShowStockForm(false);
        setShowViewModal(false);
        setViewingItem(null);
        setStockSuccess(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      setSuppliers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => (s.status || 'Active') === 'Active')
      );
    } catch (e) {
      console.error('Error fetching suppliers:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Only allow creating new products (no editing after creation)
      await addDoc(collection(db, 'products'), {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setShowForm(false);
      setFormData({ name: '', sku: '', category: 'Electronics', price: '', stock: '', minStock: '', status: 'Active' });
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
      await updateDoc(doc(db, 'products', item.id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      fetchItems();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleViewOpen = (item) => {
    setViewingItem(item);
    setViewPrice(item.price.toString());
    setViewMinStock(item.minStock.toString());
    setViewStatus(item.status);
    setShowViewModal(true);
  };

  const handleViewSave = async () => {
    try {
      await updateDoc(doc(db, 'products', viewingItem.id), {
        price: parseFloat(viewPrice),
        minStock: parseInt(viewMinStock),
        status: viewStatus,
        updatedAt: new Date(),
      });
      fetchItems();
      setShowViewModal(false);
      setViewingItem(null);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  // ---- Add Stock helpers ----
  const openStockForm = async () => {
    setStockRows([{ ...emptyStockRow }]);
    setStockNote('');
    setStockDate(new Date().toISOString().split('T')[0]);
    setStockSupplier('');
    setStockSuccess(false);
    // Refresh suppliers before opening
    await fetchSuppliers();
    setShowStockForm(true);
  };

  const updateStockRow = (index, field, value) => {
    const updated = [...stockRows];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'productId') {
      const product = items.find((p) => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].sku = product.sku;
        updated[index].currentStock = product.stock || 0;
        updated[index].costPerUnit = product.price || 0;
      } else {
        updated[index].productName = '';
        updated[index].sku = '';
        updated[index].currentStock = 0;
        updated[index].costPerUnit = 0;
      }
    }
    setStockRows(updated);
  };

  const addStockRow = () => {
    setStockRows([...stockRows, { ...emptyStockRow }]);
  };

  const removeStockRow = (index) => {
    if (stockRows.length <= 1) return;
    setStockRows(stockRows.filter((_, i) => i !== index));
  };

  const stockGrandTotal = stockRows.reduce((sum, r) => sum + r.addQty * r.costPerUnit, 0);
  const totalUnitsToAdd = stockRows.reduce((sum, r) => sum + (parseInt(r.addQty) || 0), 0);

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const validRows = stockRows.filter((r) => r.productId && r.addQty > 0);
    if (validRows.length === 0) {
      alert('Please select at least one product and enter a quantity to add.');
      return;
    }
    setStockSubmitting(true);
    try {
      // Update each product's stock in Firestore
      for (const row of validRows) {
        const product = items.find((p) => p.id === row.productId);
        if (product) {
          const newStock = (product.stock || 0) + parseInt(row.addQty);
          await updateDoc(doc(db, 'products', row.productId), {
            stock: newStock,
            updatedAt: new Date(),
          });
        }
      }

      // Log the stock entry to a stockEntries collection for audit trail
      const supplierName = suppliers.find((s) => s.id === stockSupplier)?.name || '';
      await addDoc(collection(db, 'stockEntries'), {
        date: stockDate,
        supplierName,
        supplierId: stockSupplier,
        items: validRows.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.sku,
          qtyAdded: parseInt(r.addQty),
          costPerUnit: parseFloat(r.costPerUnit),
          lineTotal: parseInt(r.addQty) * parseFloat(r.costPerUnit),
        })),
        totalUnits: validRows.reduce((s, r) => s + parseInt(r.addQty), 0),
        totalCost: validRows.reduce((s, r) => s + parseInt(r.addQty) * parseFloat(r.costPerUnit), 0),
        note: stockNote,
        createdAt: new Date(),
      });

      setStockSuccess(true);
      fetchItems();
      // Auto-close after 1.5s
      setTimeout(() => {
        setShowStockForm(false);
        setStockSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock. Please try again.');
    } finally {
      setStockSubmitting(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLowStock = (item) => item.stock < item.minStock;
  const getStockPercentage = (stock) => Math.min((stock / 100) * 100, 100);
  const isAdmin = userRole === 'admin';

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ============ VIEW MODAL ============
  const renderViewModal = () => {
    if (!showViewModal || !viewingItem) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={() => { setShowViewModal(false); setViewingItem(null); }}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
            <button onClick={() => { setShowViewModal(false); setViewingItem(null); }} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Read-only fields */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Product Name</label>
              <p className="text-sm text-gray-900 font-medium">{viewingItem.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SKU</label>
              <p className="text-sm text-gray-900 font-medium">{viewingItem.sku}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
              <p className="text-sm text-gray-900 font-medium">{viewingItem.category}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Current Stock</label>
              <p className="text-sm text-gray-900 font-medium">{viewingItem.stock}</p>
            </div>

            {/* Editable fields */}
            <div className="border-t border-gray-200 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={viewPrice}
                  onChange={(e) => setViewPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  min="0"
                  value={viewMinStock}
                  onChange={(e) => setViewMinStock(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={viewStatus}
                  onChange={(e) => setViewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!isAdmin}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowViewModal(false); setViewingItem(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Close
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleViewSave}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ ADD STOCK MODAL ============
  const renderStockModal = () => {
    if (!showStockForm) return null;

    // Products already selected in other rows (to prevent duplicates)
    const selectedIds = stockRows.map((r) => r.productId).filter(Boolean);

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={() => { setShowStockForm(false); setStockSuccess(false); }}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <PackagePlus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Stock</h2>
                <p className="text-sm text-gray-500">Receive inventory for multiple products at once</p>
              </div>
            </div>
            <button onClick={() => { setShowStockForm(false); setStockSuccess(false); }} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {/* Success state */}
          {stockSuccess ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Stock Updated Successfully</h3>
              <p className="text-gray-500">
                {totalUnitsToAdd} units added across {stockRows.filter(r => r.productId && r.addQty > 0).length} product(s)
              </p>
            </div>
          ) : (
            <form onSubmit={handleStockSubmit} className="p-6 space-y-5">
              {/* Date + Reference + Supplier */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={stockDate}
                    onChange={(e) => setStockDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={stockSupplier}
                    onChange={(e) => setStockSupplier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note / Reference</label>
                  <input
                    type="text"
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    placeholder="e.g. PO-2026-001..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock line items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Products to Receive <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                    <div className="col-span-3">Product</div>
                    <div className="col-span-1">SKU</div>
                    <div className="col-span-2 text-center">Current Stock</div>
                    <div className="col-span-2 text-center">Add Qty</div>
                    <div className="col-span-2 text-right">Cost/Unit (₹)</div>
                    <div className="col-span-1 text-right">Line Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Rows */}
                  {stockRows.map((row, idx) => {
                    const newStock = row.currentStock + (parseInt(row.addQty) || 0);
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-t border-gray-100">
                        <div className="col-span-3">
                          <select
                            value={row.productId}
                            onChange={(e) => updateStockRow(idx, 'productId', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select product...</option>
                            {items
                              .filter((p) => p.status === 'Active')
                              .filter((p) => !selectedIds.includes(p.id) || p.id === row.productId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <span className="text-xs text-gray-500">{row.sku || '—'}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm text-gray-600">{row.productId ? row.currentStock : '—'}</span>
                          {row.productId && row.addQty > 0 && (
                            <span className="text-xs text-green-600 ml-1">→ {newStock}</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={row.addQty || ''}
                            onChange={(e) => updateStockRow(idx, 'addQty', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.costPerUnit || ''}
                            onChange={(e) => updateStockRow(idx, 'costPerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium text-gray-800">
                          ₹{(row.addQty * row.costPerUnit).toFixed(2)}
                        </div>
                        <div className="col-span-1 text-center">
                          {stockRows.length > 1 && (
                            <button type="button" onClick={() => removeStockRow(idx)} className="text-red-400 hover:text-red-600">
                              <MinusCircle size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add row button */}
                  <div className="px-3 py-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={addStockRow}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      <PlusCircle size={16} /> Add Another Product
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Total Products</span>
                  <span className="font-medium">{stockRows.filter((r) => r.productId).length}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Total Units to Add</span>
                  <span className="font-medium">{totalUnitsToAdd}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-2">
                  <span>Total Cost</span>
                  <span>₹{stockGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Low stock alert */}
              {items.some(isLowStock) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Low stock products:</p>
                    <p className="text-amber-700">
                      {items
                        .filter(isLowStock)
                        .map((p) => `${p.name} (${p.stock}/${p.minStock})`)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {stockSubmitting ? (
                    <><Loader size={16} className="animate-spin" /> Updating...</>
                  ) : (
                    <><PackagePlus size={16} /> Receive Stock</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openStockForm}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <PackagePlus size={20} /> Add Stock
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setFormData({ name: '', sku: '', category: 'Electronics', price: '', stock: '', minStock: '', status: 'Active' });
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus size={20} /> Add Product
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No products found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create your first product to get started'}
            </p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Stock</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className={isLowStock(item) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">₹{(item.price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                          <div
                            className={`h-2 rounded-full transition ${isLowStock(item) ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${getStockPercentage(item.stock)}%` }}
                          />
                        </div>
                        <span className="text-gray-600 whitespace-nowrap">{item.stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleViewOpen(item)} className="text-blue-600 hover:text-blue-900 p-1" title="View">
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`p-1 ${item.status === 'Active' ? 'text-green-600 hover:text-green-900' : 'text-gray-400 hover:text-gray-600'}`}
                            title={item.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <Ban size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal - CREATE ONLY */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowForm(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">Add Product</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500 ml-1">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-red-500 ml-1">*</span></label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500 ml-1">*</span></label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Electronics</option>
                  <option>Furniture</option>
                  <option>Stationery</option>
                  <option>Networking</option>
                  <option>Storage</option>
                  <option>Accessories</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) <span className="text-red-500 ml-1">*</span></label>
                <input type="number" step="0.01" min="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock <span className="text-red-500 ml-1">*</span></label>
                <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock <span className="text-red-500 ml-1">*</span></label>
                <input type="number" min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {renderViewModal()}

      {/* Add Stock Modal */}
      {renderStockModal()}
    </div>
  );
}
