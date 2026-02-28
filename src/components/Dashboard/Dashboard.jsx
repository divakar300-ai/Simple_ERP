import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  IndianRupee,
  Loader,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { seedDemoData, isDemoDataSeeded } from '../../firebase/seed';
import { AuthContext } from '../../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { userRole } = useContext(AuthContext) || { userRole: 'user' };
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isEmpty, setIsEmpty] = useState(false);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch orders
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        const orders = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch products
        const productsRef = collection(db, 'products');
        const productsSnap = await getDocs(productsRef);
        const products = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch customers
        const customersRef = collection(db, 'customers');
        const customersSnap = await getDocs(customersRef);
        const customers = customersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Check if data exists
        if (orders.length === 0 && products.length === 0 && customers.length === 0) {
          setIsEmpty(true);
          setLoading(false);
          return;
        }

        // Calculate KPIs
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;
        const totalProducts = products.length;
        const totalCustomers = customers.length;

        setKpiData({
          totalRevenue,
          totalOrders,
          totalProducts,
          totalCustomers,
        });

        // Process revenue data (last 7 months)
        const revenueByMonth = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          revenueByMonth[monthKey] = 0;
        }

        orders.forEach((order) => {
          // Handle both Firestore Timestamp and ISO date string
          let orderDate = null;
          if (order.createdAt?.seconds) {
            orderDate = new Date(order.createdAt.seconds * 1000);
          } else if (order.createdAt?.toDate) {
            orderDate = order.createdAt.toDate();
          } else if (order.date) {
            orderDate = new Date(order.date);
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          }

          if (orderDate && !isNaN(orderDate)) {
            const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (revenueByMonth.hasOwnProperty(monthKey)) {
              revenueByMonth[monthKey] += order.total || 0;
            }
          }
        });

        const processedRevenueData = Object.entries(revenueByMonth).map(([month, revenue]) => ({
          month,
          revenue: Math.round(revenue),
        }));
        setRevenueData(processedRevenueData);

        // Process order status data
        const statusCounts = {
          Pending: 0,
          Processing: 0,
          Shipped: 0,
          Delivered: 0,
        };

        orders.forEach((order) => {
          const status = order.status || 'Pending';
          const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          if (statusCounts.hasOwnProperty(capitalizedStatus)) {
            statusCounts[capitalizedStatus]++;
          }
        });

        const processedOrderStatusData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count,
        }));
        setOrderStatusData(processedOrderStatusData);

        // Get recent orders (last 5)
        const getOrderDate = (order) => {
          if (order.createdAt?.seconds) return new Date(order.createdAt.seconds * 1000);
          if (order.createdAt?.toDate) return order.createdAt.toDate();
          if (order.date) return new Date(order.date);
          return new Date(0);
        };

        const recentOrdersList = orders
          .sort((a, b) => getOrderDate(b) - getOrderDate(a))
          .slice(0, 5);
        setRecentOrders(recentOrdersList);

        // Find low stock products
        const lowStock = products.filter((product) => {
          const currentStock = product.stock || 0;
          const minStock = product.minStock || 10;
          return currentStock < minStock;
        });
        setLowStockProducts(lowStock);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSeedData = async () => {
    try {
      setLoading(true);
      const alreadySeeded = await isDemoDataSeeded(db);
      if (alreadySeeded) {
        if (!window.confirm('Demo data already exists. Loading again will create duplicates. Continue?')) {
          setLoading(false);
          return;
        }
      }
      await seedDemoData(db);
      // Refresh dashboard after seeding
      window.location.reload();
    } catch (error) {
      console.error('Error seeding demo data:', error);
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL data (orders, products, customers, suppliers). Are you sure?')) return;
    if (!window.confirm('This action cannot be undone. Type OK to confirm.')) return;
    setLoading(true);
    try {
      const collections = ['orders', 'products', 'customers', 'suppliers', 'stockEntries'];
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, col, d.id));
        }
      }
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Error resetting data');
      setLoading(false);
    }
  };

  const handlePieClick = (data) => {
    if (data && data.name) {
      navigate(`/sales?status=${data.name}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-4">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Data Available</h2>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          Your ERP system is empty. Load demo data to see the dashboard in action.
        </p>
        <button
          onClick={handleSeedData}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Load Demo Data
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 flex flex-col">
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div
            onClick={() => navigate('/sales')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-semibold">Total Revenue</h3>
              <div className="p-3 bg-green-100 rounded-lg">
                <IndianRupee className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{kpiData.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <div className="flex items-center mt-3 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>All time</span>
            </div>
          </div>

          {/* Total Orders Card */}
          <div
            onClick={() => navigate('/sales')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-semibold">Total Orders</h3>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpiData.totalOrders}</p>
            <div className="flex items-center mt-3 text-blue-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>All time</span>
            </div>
          </div>

          {/* Total Products Card */}
          <div
            onClick={() => navigate('/inventory')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-semibold">Total Products</h3>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpiData.totalProducts}</p>
            <div className="flex items-center mt-3 text-purple-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>In catalog</span>
            </div>
          </div>

          {/* Total Customers Card */}
          <div
            onClick={() => navigate('/customers')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-semibold">Total Customers</h3>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpiData.totalCustomers}</p>
            <div className="flex items-center mt-3 text-orange-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Registered</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by Status Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                >
                  <Cell fill="#fbbf24" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#a78bfa" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const statusColor = {
                        pending: 'bg-yellow-100 text-yellow-800',
                        processing: 'bg-blue-100 text-blue-800',
                        shipped: 'bg-purple-100 text-purple-800',
                        delivered: 'bg-green-100 text-green-800',
                      };
                      const status = (order.status || 'pending').toLowerCase();
                      let dateStr = 'N/A';
                      if (order.date) {
                        dateStr = new Date(order.date).toLocaleDateString();
                      } else if (order.createdAt?.seconds) {
                        dateStr = new Date(order.createdAt.seconds * 1000).toLocaleDateString();
                      } else if (order.createdAt) {
                        dateStr = new Date(order.createdAt).toLocaleDateString();
                      }

                      return (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900 font-medium">{order.orderNumber || `#${order.id?.slice(0, 8)}`}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{order.customerName || 'Unknown'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 font-semibold">
                            ₹{order.total?.toFixed(2) || '0.00'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[status] || 'bg-gray-100 text-gray-800'}`}>
                              {order.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              Low Stock Alerts
            </h2>
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">All products are well stocked</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Stock: <span className="font-semibold text-red-600">{product.stock || 0}</span> / Min: {product.minStock || 10}
                      </p>
                    </div>
                    <div className="ml-4 p-2 bg-red-100 rounded">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Panel */}
        {userRole === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 text-orange-600 mr-2" />
              Admin Panel
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSeedData}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Load Demo Data
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset All Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-gray-400 text-xs border-t border-gray-200 mt-4">
        SimpleERP &middot; Designed & Developed by Divakar Dadhich
      </div>
    </div>
  );
};

export default Dashboard;
