import {
  collection,
  addDoc,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';

/**
 * Generate demo products - Indian market with realistic INR prices
 * Status must be 'Active' or 'Inactive' to match Inventory module
 * Categories: Electronics, Furniture, Stationery, Networking, Storage, Accessories
 */
const generateProducts = () => [
  { name: 'Dell Inspiron 15 Laptop', sku: 'DELL-LAP-001', category: 'Electronics', price: 54999, stock: 8, minStock: 3, status: 'Active' },
  { name: 'HP LaserJet Pro Printer', sku: 'HP-PRINT-002', category: 'Electronics', price: 18499, stock: 12, minStock: 5, status: 'Active' },
  { name: 'Logitech MX Master 3S Mouse', sku: 'LOG-MOUSE-003', category: 'Accessories', price: 8999, stock: 45, minStock: 10, status: 'Active' },
  { name: 'Samsung 27" 4K Monitor', sku: 'SAM-MON-004', category: 'Electronics', price: 28999, stock: 6, minStock: 4, status: 'Active' },
  { name: 'Herman Miller Aeron Chair', sku: 'HM-CHAIR-005', category: 'Furniture', price: 129999, stock: 2, minStock: 1, status: 'Active' },
  { name: 'Apple Magic Keyboard', sku: 'APP-KB-006', category: 'Accessories', price: 10900, stock: 20, minStock: 8, status: 'Active' },
  { name: 'TP-Link WiFi 6 Router', sku: 'TP-ROUTE-007', category: 'Networking', price: 4999, stock: 35, minStock: 8, status: 'Active' },
  { name: 'Western Digital 1TB External SSD', sku: 'WD-SSD-008', category: 'Storage', price: 7499, stock: 28, minStock: 10, status: 'Active' },
  { name: 'Zebronics Mechanical Keyboard', sku: 'ZEB-KB-009', category: 'Electronics', price: 2499, stock: 68, minStock: 15, status: 'Active' },
  { name: 'Classmate Premium Notebooks (Pack of 6)', sku: 'CLASS-NOTE-010', category: 'Stationery', price: 420, stock: 150, minStock: 30, status: 'Active' },
  { name: 'APC UPS 1100VA', sku: 'APC-UPS-011', category: 'Accessories', price: 6999, stock: 18, minStock: 5, status: 'Active' },
  { name: 'Logitech C920 HD Webcam', sku: 'LOG-WEB-012', category: 'Electronics', price: 7499, stock: 22, minStock: 6, status: 'Active' },
  { name: 'Adjustable Standing Desk', sku: 'ADJ-DESK-013', category: 'Furniture', price: 24999, stock: 5, minStock: 2, status: 'Active' },
  { name: 'Cable Management Kit', sku: 'CABLE-KIT-014', category: 'Accessories', price: 899, stock: 95, minStock: 20, status: 'Active' },
  { name: 'Belkin USB-C Hub (7-in-1)', sku: 'BELK-HUB-015', category: 'Accessories', price: 4499, stock: 32, minStock: 8, status: 'Active' },
];

/**
 * Generate demo customers - Indian companies
 * Uses status (Active/Disabled)
 */
const generateCustomers = () => [
  { name: 'Reliance Digital Solutions', email: 'procurement@reliancedigital.in', phone: '+91 9876543210', company: 'Reliance Digital', status: 'Active' },
  { name: 'Infosys Technologies', email: 'orders@infosys.in', phone: '+91 9876543211', company: 'Infosys Ltd', status: 'Active' },
  { name: 'Wipro Ltd', email: 'purchasing@wipro.com', phone: '+91 9876543212', company: 'Wipro', status: 'Active' },
  { name: 'Tata Consultancy Services', email: 'supply@tcs.com', phone: '+91 9876543213', company: 'TCS', status: 'Active' },
  { name: 'HCL Technologies', email: 'procurement@hcl.in', phone: '+91 9876543214', company: 'HCL Tech', status: 'Active' },
  { name: 'Tech Mahindra', email: 'buying@techmahindra.com', phone: '+91 9876543215', company: 'Tech Mahindra', status: 'Active' },
];

/**
 * Generate demo suppliers - Indian suppliers
 * Uses status (Active/Disabled)
 */
const generateSuppliers = () => [
  { name: 'Ingram Micro India', email: 'sales@ingrammicro.in', phone: '+91 9800000001', company: 'Ingram Micro India', status: 'Active' },
  { name: 'Redington India', email: 'support@redingtonindia.com', phone: '+91 9800000002', company: 'Redington', status: 'Active' },
  { name: 'Compuage Infocom', email: 'orders@compuage.com', phone: '+91 9800000003', company: 'Compuage', status: 'Active' },
  { name: 'Savex Technologies', email: 'contact@savextech.com', phone: '+91 9800000004', company: 'Savex', status: 'Active' },
  { name: 'Rashi Peripherals', email: 'purchase@rashi.com', phone: '+91 9800000005', company: 'Rashi Peripherals', status: 'Active' },
];

/**
 * Generate demo orders - spread across last 6 months
 * Uses lineItems array with product details, subtotal/discount/GST/total breakdown
 * Also keeps legacy `items` text string for dashboard/table display compatibility
 */
const generateOrders = () => {
  const today = new Date();
  const orders = [];
  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
  const paymentStatuses = ['Unpaid', 'Partial', 'Paid'];
  const paymentMethods = ['UPI', 'Bank Transfer', 'Credit Card', 'Cash', 'Net Banking', 'Cheque'];
  const customers = [
    { name: 'Reliance Digital Solutions', email: 'procurement@reliancedigital.in' },
    { name: 'Infosys Technologies', email: 'orders@infosys.in' },
    { name: 'Wipro Ltd', email: 'purchasing@wipro.com' },
    { name: 'Tata Consultancy Services', email: 'supply@tcs.com' },
    { name: 'HCL Technologies', email: 'procurement@hcl.in' },
    { name: 'Tech Mahindra', email: 'buying@techmahindra.com' },
  ];

  // Each order's line items reference real products from generateProducts()
  const orderLineItems = [
    [
      { productName: 'Dell Inspiron 15 Laptop', sku: 'DELL-LAP-001', qty: 2, unitPrice: 54999 },
      { productName: 'Logitech MX Master 3S Mouse', sku: 'LOG-MOUSE-003', qty: 2, unitPrice: 8999 },
    ],
    [
      { productName: 'Samsung 27" 4K Monitor', sku: 'SAM-MON-004', qty: 1, unitPrice: 28999 },
      { productName: 'Zebronics Mechanical Keyboard', sku: 'ZEB-KB-009', qty: 1, unitPrice: 2499 },
    ],
    [
      { productName: 'HP LaserJet Pro Printer', sku: 'HP-PRINT-002', qty: 1, unitPrice: 18499 },
      { productName: 'Western Digital 1TB External SSD', sku: 'WD-SSD-008', qty: 2, unitPrice: 7499 },
    ],
    [
      { productName: 'Logitech MX Master 3S Mouse', sku: 'LOG-MOUSE-003', qty: 5, unitPrice: 8999 },
      { productName: 'Cable Management Kit', sku: 'CABLE-KIT-014', qty: 3, unitPrice: 899 },
    ],
    [
      { productName: 'Herman Miller Aeron Chair', sku: 'HM-CHAIR-005', qty: 1, unitPrice: 129999 },
    ],
    [
      { productName: 'Adjustable Standing Desk', sku: 'ADJ-DESK-013', qty: 1, unitPrice: 24999 },
      { productName: 'Apple Magic Keyboard', sku: 'APP-KB-006', qty: 1, unitPrice: 10900 },
    ],
    [
      { productName: 'TP-Link WiFi 6 Router', sku: 'TP-ROUTE-007', qty: 3, unitPrice: 4999 },
      { productName: 'Dell Inspiron 15 Laptop', sku: 'DELL-LAP-001', qty: 1, unitPrice: 54999 },
    ],
    [
      { productName: 'Zebronics Mechanical Keyboard', sku: 'ZEB-KB-009', qty: 4, unitPrice: 2499 },
      { productName: 'Classmate Premium Notebooks (Pack of 6)', sku: 'CLASS-NOTE-010', qty: 10, unitPrice: 420 },
    ],
    [
      { productName: 'Samsung 27" 4K Monitor', sku: 'SAM-MON-004', qty: 2, unitPrice: 28999 },
      { productName: 'Logitech C920 HD Webcam', sku: 'LOG-WEB-012', qty: 1, unitPrice: 7499 },
    ],
    [
      { productName: 'Western Digital 1TB External SSD', sku: 'WD-SSD-008', qty: 4, unitPrice: 7499 },
      { productName: 'APC UPS 1100VA', sku: 'APC-UPS-011', qty: 1, unitPrice: 6999 },
    ],
    [
      { productName: 'Dell Inspiron 15 Laptop', sku: 'DELL-LAP-001', qty: 1, unitPrice: 54999 },
      { productName: 'HP LaserJet Pro Printer', sku: 'HP-PRINT-002', qty: 1, unitPrice: 18499 },
      { productName: 'Belkin USB-C Hub (7-in-1)', sku: 'BELK-HUB-015', qty: 2, unitPrice: 4499 },
    ],
    [
      { productName: 'Apple Magic Keyboard', sku: 'APP-KB-006', qty: 3, unitPrice: 10900 },
      { productName: 'Logitech C920 HD Webcam', sku: 'LOG-WEB-012', qty: 2, unitPrice: 7499 },
    ],
    [
      { productName: 'Herman Miller Aeron Chair', sku: 'HM-CHAIR-005', qty: 1, unitPrice: 129999 },
      { productName: 'Adjustable Standing Desk', sku: 'ADJ-DESK-013', qty: 1, unitPrice: 24999 },
    ],
    [
      { productName: 'TP-Link WiFi 6 Router', sku: 'TP-ROUTE-007', qty: 2, unitPrice: 4999 },
      { productName: 'Belkin USB-C Hub (7-in-1)', sku: 'BELK-HUB-015', qty: 1, unitPrice: 4499 },
    ],
    [
      { productName: 'Classmate Premium Notebooks (Pack of 6)', sku: 'CLASS-NOTE-010', qty: 20, unitPrice: 420 },
      { productName: 'Cable Management Kit', sku: 'CABLE-KIT-014', qty: 5, unitPrice: 899 },
    ],
  ];
  const discounts = [5, 0, 10, 0, 5, 0, 10, 0, 5, 0, 0, 5, 0, 10, 0]; // discount percentages

  for (let i = 0; i < 15; i++) {
    // Spread orders across last 6 months - roughly 2-3 orders per month
    const monthsAgo = Math.floor(i / 3);
    const daysOffset = Math.floor(Math.random() * 28);
    const orderDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, today.getDate() - daysOffset);

    // Delivery date a few days after order
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 3 + Math.floor(Math.random() * 7));
    const deliveryStr = deliveryDate.toISOString().split('T')[0];
    const dateStr = orderDate.toISOString().split('T')[0];

    // Older orders tend to be Delivered, newer ones are more mixed
    let status;
    if (monthsAgo >= 3) {
      status = 'Delivered';
    } else if (monthsAgo >= 1) {
      status = ['Processing', 'Shipped', 'Delivered'][Math.floor(Math.random() * 3)];
    } else {
      status = statuses[Math.floor(Math.random() * 4)];
    }

    let paymentStatus;
    if (status === 'Delivered') {
      paymentStatus = Math.random() > 0.15 ? 'Paid' : 'Partial';
    } else if (status === 'Pending') {
      paymentStatus = Math.random() > 0.6 ? 'Unpaid' : 'Partial';
    } else {
      paymentStatus = paymentStatuses[Math.floor(Math.random() * 3)];
    }

    const lineItems = orderLineItems[i].map(li => ({ ...li, productId: '' }));
    const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
    const discountPercent = discounts[i];
    const discountAmount = subtotal * (discountPercent / 100);
    const taxable = subtotal - discountAmount;
    const gstAmount = taxable * 0.18;
    const total = taxable + gstAmount;

    const customer = customers[Math.floor(Math.random() * customers.length)];

    orders.push({
      orderNumber: `ORD-${String(i + 1).padStart(4, '0')}`,
      customerName: customer.name,
      customerEmail: customer.email,
      customerId: '',
      lineItems,
      items: lineItems.map(li => `${li.qty}x ${li.productName}`).join(', '),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountPercent,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status,
      paymentStatus,
      paymentMethod: paymentStatus === 'Paid' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : '',
      date: dateStr,
      expectedDelivery: deliveryStr,
      shippingAddress: '',
      notes: '',
      createdAt: orderDate,
    });
  }

  return orders;
};

/**
 * Seed demo data into Firestore
 */
export const seedDemoData = async (db) => {
  try {
    const summary = { products: 0, customers: 0, suppliers: 0, orders: 0 };

    const productsCol = collection(db, 'products');
    for (const product of generateProducts()) {
      await addDoc(productsCol, { ...product, createdAt: new Date(), updatedAt: new Date() });
      summary.products++;
    }

    const customersCol = collection(db, 'customers');
    for (const customer of generateCustomers()) {
      await addDoc(customersCol, { ...customer, createdAt: new Date(), updatedAt: new Date() });
      summary.customers++;
    }

    const suppliersCol = collection(db, 'suppliers');
    for (const supplier of generateSuppliers()) {
      await addDoc(suppliersCol, { ...supplier, createdAt: new Date(), updatedAt: new Date() });
      summary.suppliers++;
    }

    const ordersCol = collection(db, 'orders');
    for (const order of generateOrders()) {
      await addDoc(ordersCol, { ...order, updatedAt: new Date() });
      summary.orders++;
    }

    console.log('Demo data seeded successfully:', summary);
    return summary;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
};

/**
 * Check if demo data has already been seeded
 */
export const isDemoDataSeeded = async (db) => {
  try {
    const q = query(collection(db, 'products'), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if demo data is seeded:', error);
    return false;
  }
};
