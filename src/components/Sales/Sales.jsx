import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { AuthContext } from '../../contexts/AuthContext';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  ShoppingCart,
  ChevronDown,
  PlusCircle,
  MinusCircle,
  Eye,
} from 'lucide-react';

const GST_RATE = 0.18; // 18% GST

const emptyLineItem = { productId: '', productName: '', sku: '', qty: 1, unitPrice: 0 };

const defaultFormData = {
  orderNumber: '',
  customerId: '',
  customerName: '',
  customerEmail: '',
  lineItems: [{ ...emptyLineItem }],
  subtotal: 0,
  discountPercent: 0,
  discountAmount: 0,
  gstAmount: 0,
  total: 0,
  status: 'Pending',
  paymentStatus: 'Unpaid',
  paymentMethod: '',
  date: new Date().toISOString().split('T')[0],
  expectedDelivery: '',
  shippingAddress: '',
  notes: '',
};

export default function Sales() {
  const { userRole } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Data from other modules
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Customer dropdown state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef(null);

  useEffect(() => {
    fetchItems();
    fetchCustomers();
    fetchProducts();
  }, []);

  // Sync status filter from URL params
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowForm(false);
        setViewingItem(null);
        setEditingItem(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
      if (data.length > 0) {
        let maxNum = 0;
        data.forEach((order) => {
          if (order.orderNumber) {
            const parts = order.orderNumber.split('-');
            const num = parseInt(parts[parts.length - 1]);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        setNextOrderNumber(maxNum + 1);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      setCustomers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => (c.status || 'Active') === 'Active')
      );
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.status === 'Active')
      );
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const generateOrderNumber = () => `ORD-${String(nextOrderNumber).padStart(4, '0')}`;

  // ---- Calculation helpers ----
  const recalcTotals = (lineItems, discountPercent) => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const taxable = subtotal - discountAmount;
    const gstAmount = taxable * GST_RATE;
    const total = taxable + gstAmount;
    return { subtotal, discountAmount, gstAmount, total };
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // If product changed, auto-fill price and name
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].sku = product.sku;
        updated[index].unitPrice = product.price;
      }
    }

    const totals = recalcTotals(updated, formData.discountPercent);
    setFormData({ ...formData, lineItems: updated, ...totals });
  };

  const addLineItem = () => {
    const updated = [...formData.lineItems, { ...emptyLineItem }];
    setFormData({ ...formData, lineItems: updated });
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length <= 1) return;
    const updated = formData.lineItems.filter((_, i) => i !== index);
    const totals = recalcTotals(updated, formData.discountPercent);
    setFormData({ ...formData, lineItems: updated, ...totals });
  };

  const updateDiscount = (val) => {
    const discountPercent = parseFloat(val) || 0;
    const totals = recalcTotals(formData.lineItems, discountPercent);
    setFormData({ ...formData, discountPercent, ...totals });
  };

  // ---- Customer selection ----
  const selectCustomer = (cust) => {
    setFormData({
      ...formData,
      customerId: cust.id,
      customerName: cust.name,
      customerEmail: cust.email || '',
    });
    setCustomerSearch(cust.name);
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ---- Submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double-submit

    // Validate at least one line item has a product
    const validItems = formData.lineItems.filter((li) => li.productName);
    if (validItems.length === 0) {
      alert('Please add at least one product to the order.');
      return;
    }

    // Stock validation before submitting
    for (const li of validItems) {
      if (li.productId) {
        const product = products.find((p) => p.id === li.productId);
        if (product && li.qty > product.stock) {
          alert(`Insufficient stock for "${li.productName}". Available: ${product.stock}, Requested: ${li.qty}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const orderNumber = editingItem ? editingItem.orderNumber : generateOrderNumber();
      const payload = {
        orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        lineItems: formData.lineItems.filter((li) => li.productName),
        subtotal: parseFloat(formData.subtotal.toFixed(2)),
        discountPercent: formData.discountPercent,
        discountAmount: parseFloat(formData.discountAmount.toFixed(2)),
        gstAmount: parseFloat(formData.gstAmount.toFixed(2)),
        total: parseFloat(formData.total.toFixed(2)),
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        date: formData.date,
        expectedDelivery: formData.expectedDelivery,
        shippingAddress: formData.shippingAddress,
        notes: formData.notes,
        // Legacy field for dashboard/search compat
        items: formData.lineItems
          .filter((li) => li.productName)
          .map((li) => `${li.qty}x ${li.productName}`)
          .join(', '),
      };

      if (editingItem) {
        // When editing, handle stock adjustments (restore old, deduct new)
        const oldLineItems = editingItem.lineItems || [];

        // Process stock adjustments in a transaction
        await runTransaction(db, async (transaction) => {
          // Restore stock for old line items
          for (const oldLi of oldLineItems) {
            if (oldLi.productId) {
              const productRef = doc(db, 'products', oldLi.productId);
              const productDoc = await transaction.get(productRef);
              if (productDoc.exists()) {
                const currentStock = productDoc.data().stock || 0;
                transaction.update(productRef, { stock: currentStock + oldLi.qty });
              }
            }
          }

          // Deduct stock for new line items
          for (const newLi of validItems) {
            if (newLi.productId) {
              const productRef = doc(db, 'products', newLi.productId);
              const productDoc = await transaction.get(productRef);
              if (productDoc.exists()) {
                const currentStock = productDoc.data().stock || 0;
                if (currentStock < newLi.qty) {
                  throw new Error(`Insufficient stock for "${newLi.productName}". Available: ${currentStock}, Requested: ${newLi.qty}`);
                }
                transaction.update(productRef, { stock: currentStock - newLi.qty });
              }
            }
          }

          // Update the order
          transaction.update(doc(db, 'orders', editingItem.id), { ...payload, updatedAt: new Date() });
        });
      } else {
        // When creating, deduct stock for all line items in a transaction
        await runTransaction(db, async (transaction) => {
          for (const li of validItems) {
            if (li.productId) {
              const productRef = doc(db, 'products', li.productId);
              const productDoc = await transaction.get(productRef);
              if (productDoc.exists()) {
                const currentStock = productDoc.data().stock || 0;
                if (currentStock < li.qty) {
                  throw new Error(`Insufficient stock for "${li.productName}". Available: ${currentStock}, Requested: ${li.qty}`);
                }
                transaction.update(productRef, { stock: currentStock - li.qty });
              }
            }
          }

          // Create the order
          // Note: addDoc cannot be used within a transaction, so we'll create the order after the transaction
        });

        // Create the order after stock is deducted
        await addDoc(collection(db, 'orders'), { ...payload, createdAt: new Date(), updatedAt: new Date() });
        setNextOrderNumber(nextOrderNumber + 1);
      }

      closeForm();
      fetchItems();
    } catch (error) {
      console.error('Error saving order:', error);
      alert(error.message || 'Error saving order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setViewingItem(null);
    setCustomerSearch('');
    setFormData({ ...defaultFormData, lineItems: [{ ...emptyLineItem }] });
  };

  const handleEdit = (item) => {
    const lineItems =
      item.lineItems && item.lineItems.length > 0
        ? item.lineItems
        : [{ productId: '', productName: '', sku: '', qty: 1, unitPrice: item.total || 0 }];
    setEditingItem(item);
    setFormData({
      orderNumber: item.orderNumber,
      customerId: item.customerId || '',
      customerName: item.customerName,
      customerEmail: item.customerEmail || '',
      lineItems,
      subtotal: item.subtotal || item.total || 0,
      discountPercent: item.discountPercent || 0,
      discountAmount: item.discountAmount || 0,
      gstAmount: item.gstAmount || 0,
      total: item.total || 0,
      status: item.status,
      paymentStatus: item.paymentStatus,
      paymentMethod: item.paymentMethod || '',
      date: item.date,
      expectedDelivery: item.expectedDelivery || '',
      shippingAddress: item.shippingAddress || '',
      notes: item.notes || '',
    });
    setCustomerSearch(item.customerName);
    setShowForm(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      setDeleting(true);
      try {
        // Get the order to restore stock
        const orderToDelete = items.find((item) => item.id === id);
        if (orderToDelete && orderToDelete.lineItems) {
          // Restore stock for all line items in a transaction
          await runTransaction(db, async (transaction) => {
            for (const li of orderToDelete.lineItems) {
              if (li.productId) {
                const productRef = doc(db, 'products', li.productId);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                  const currentStock = productDoc.data().stock || 0;
                  transaction.update(productRef, { stock: currentStock + li.qty });
                }
              }
            }
          });
        }

        // Delete the order
        await deleteDoc(doc(db, 'orders', id));
        fetchItems();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order. Please try again.');
      } finally {
        setDeleting(false);
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.items || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Processing: 'bg-blue-100 text-blue-800',
      Shipped: 'bg-purple-100 text-purple-800',
      Delivered: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentColor = (status) => {
    const colors = {
      Paid: 'bg-green-100 text-green-800',
      Unpaid: 'bg-red-100 text-red-800',
      Partial: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  // Quick actions from view modal
  const handleQuickStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: new Date() });
      // Update local state
      setItems((prev) => prev.map((i) => i.id === orderId ? { ...i, status: newStatus } : i));
      setViewingItem((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleQuickPaymentUpdate = async (orderId, newPaymentStatus, paymentMethod = '') => {
    const update = { paymentStatus: newPaymentStatus, updatedAt: new Date() };
    if (paymentMethod) update.paymentMethod = paymentMethod;
    try {
      await updateDoc(doc(db, 'orders', orderId), update);
      setItems((prev) => prev.map((i) => i.id === orderId ? { ...i, ...update } : i));
      setViewingItem((prev) => prev ? { ...prev, ...update } : null);
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  // ============ VIEW ORDER DETAIL MODAL ============
  const renderViewModal = () => {
    if (!viewingItem) return null;
    const o = viewingItem;
    const lineItems = o.lineItems || [];
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={() => setViewingItem(null)}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Order {o.orderNumber}</h2>
            <button onClick={() => setViewingItem(null)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            {/* Customer & dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Customer</p>
                <p className="text-sm font-medium">{o.customerName}</p>
                {o.customerEmail && <p className="text-xs text-gray-500">{o.customerEmail}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Order Date</p>
                <p className="text-sm">{new Date(o.date).toLocaleDateString()}</p>
                {o.expectedDelivery && (
                  <>
                    <p className="text-xs text-gray-500 uppercase font-semibold mt-2">Expected Delivery</p>
                    <p className="text-sm">{new Date(o.expectedDelivery).toLocaleDateString()}</p>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions — Status & Payment */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Order Status</p>
                <div className="flex gap-2 flex-wrap">
                  {['Pending', 'Processing', 'Shipped', 'Delivered'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleQuickStatusUpdate(o.id, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        o.status === s
                          ? getStatusColor(s) + ' ring-2 ring-offset-1 ring-blue-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Payment Status</p>
                <div className="flex gap-2 flex-wrap">
                  {['Unpaid', 'Partial', 'Paid'].map((ps) => (
                    <button
                      key={ps}
                      onClick={() => handleQuickPaymentUpdate(o.id, ps)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        o.paymentStatus === ps
                          ? getPaymentColor(ps) + ' ring-2 ring-offset-1 ring-blue-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {ps}
                    </button>
                  ))}
                </div>
              </div>
              {o.paymentMethod && (
                <p className="text-xs text-gray-500">Payment method: <span className="font-medium text-gray-700">{o.paymentMethod}</span></p>
              )}
            </div>

            {/* Line items table */}
            {lineItems.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Line Items</p>
                <table className="w-full text-sm border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((li, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{li.productName}</td>
                        <td className="px-3 py-2 text-gray-500">{li.sku}</td>
                        <td className="px-3 py-2 text-right">{li.qty}</td>
                        <td className="px-3 py-2 text-right">₹{(li.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium">₹{(li.qty * li.unitPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Items</p>
                <p className="text-sm">{o.items || '—'}</p>
              </div>
            )}

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{(o.subtotal || o.total || 0).toFixed(2)}</span></div>
              {(o.discountPercent || 0) > 0 && (
                <div className="flex justify-between text-red-600"><span>Discount ({o.discountPercent}%)</span><span>-₹{(o.discountAmount || 0).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span>GST (18%)</span><span>₹{(o.gstAmount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-2">
                <span>Total</span><span>₹{(o.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping & notes */}
            {o.shippingAddress && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Shipping Address</p>
                <p className="text-sm whitespace-pre-line">{o.shippingAddress}</p>
              </div>
            )}
            {o.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Notes</p>
                <p className="text-sm whitespace-pre-line">{o.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ ORDER FORM MODAL ============
  const renderFormModal = () => {
    if (!showForm) return null;
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={closeForm}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingItem ? 'Edit Order' : 'New Order'}
            </h2>
            <button onClick={closeForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Row 1: Order # + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input
                  type="text"
                  value={editingItem ? editingItem.orderNumber : generateOrderNumber()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required

                />
              </div>
            </div>

            {/* Row 2: Customer (dynamic dropdown) + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div ref={customerRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    // If typed value doesn't match any selected customer, clear selection
                    if (formData.customerName !== e.target.value) {
                      setFormData({ ...formData, customerId: '', customerName: e.target.value, customerEmail: '' });
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Type to search customers..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required

                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex justify-between items-center"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-gray-400">{c.company || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Auto-filled from customer"

                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line Items <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2">SKU</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Line Total</div>
                  <div className="col-span-1"></div>
                </div>
                {/* Rows */}
                {formData.lineItems.map((li, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-t border-gray-100">
                    <div className="col-span-4">
                      <select
                        value={li.productId}
                        onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
      
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={li.sku}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-500"
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={li.qty}
                        onChange={(e) => updateLineItem(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500"
      
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={li.unitPrice}
                        onChange={(e) => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
      
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium text-gray-800 pr-1">
                      ₹{(li.qty * li.unitPrice).toFixed(2)}
                    </div>
                    <div className="col-span-1 text-center">
                      {formData.lineItems.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600">
                          <MinusCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Add line item button */}
                <div className="px-3 py-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <PlusCircle size={16} /> Add Line Item
                    </button>
                  </div>
              </div>
            </div>

            {/* Totals section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Discount</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.discountPercent}
                    onChange={(e) => updateDiscount(e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
  
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <span className="text-red-600">-₹{formData.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%)</span>
                <span>₹{formData.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-1">
                <span>Grand Total</span>
                <span>₹{formData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Row: Status + Payment */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"

                >
                  <option>Pending</option>
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"

                >
                  <option>Paid</option>
                  <option>Unpaid</option>
                  <option>Partial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"

                >
                  <option value="">Select...</option>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Credit Card</option>
                  <option>Debit Card</option>
                  <option>Cheque</option>
                  <option>Net Banking</option>
                </select>
              </div>
            </div>

            {/* Expected delivery */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"

                />
              </div>
              <div></div>
            </div>

            {/* Shipping Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
              <textarea
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Street, City, State, PIN"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Remarks</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Internal notes, special instructions..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-500 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {submitting ? 'Saving...' : (editingItem ? 'Update Order' : 'Create Order')}
              </button>
            </div>
          </form>
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
            <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and track sales</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ ...defaultFormData, lineItems: [{ ...emptyLineItem }] });
              setCustomerSearch('');
              // Refresh dropdowns to get latest data
              fetchCustomers();
              fetchProducts();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} /> New Order
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by order number, customer, or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              if (e.target.value === 'All') {
                setSearchParams({});
              } else {
                setSearchParams({ status: e.target.value });
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No orders found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create your first order to get started'}
            </p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Items</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.orderNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.customerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.items || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      ₹{(item.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentColor(item.paymentStatus)}`}>
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleView(item)} disabled={deleting} className="text-gray-500 hover:text-gray-700 p-1 disabled:text-gray-300" title="View">
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleEdit(item)} disabled={deleting} className="text-blue-600 hover:text-blue-900 p-1 disabled:text-blue-300" title="Edit">
                            <Edit2 size={18} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(item.id)} disabled={deleting} className="text-red-600 hover:text-red-900 p-1 disabled:text-red-300" title="Delete">
                            <Trash2 size={18} />
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

      {/* Modals */}
      {renderFormModal()}
      {renderViewModal()}
    </div>
  );
}
