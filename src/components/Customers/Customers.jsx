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
  Search,
  Plus,
  Edit2,
  Ban,
  X,
  Loader,
  Users,
} from 'lucide-react';

export default function Customers() {
  const { userRole } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchItems();
  }, []);

  // Close form on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'customers'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        const docRef = doc(db, 'customers', editingItem.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        status: 'Active',
      });
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      company: item.company || '',
      status: item.status || 'Active',
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const docRef = doc(db, 'customers', item.id);
      const newStatus = item.status === 'Active' ? 'Disabled' : 'Active';
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      fetchItems();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.company || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate active and disabled customers
  const activeItems = filteredItems.filter((item) => item.status !== 'Disabled');
  const disabledItems = filteredItems.filter((item) => item.status === 'Disabled');

  const getAvatarColor = (name) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const getStatusBadge = (status) => {
    return status === 'Active' ? (
      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
        Active
      </span>
    ) : (
      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
        Disabled
      </span>
    );
  };

  const CustomerRow = ({ item, isDisabled }) => (
    <tr
      key={item.id}
      className={isDisabled ? 'bg-gray-100 hover:bg-gray-150 opacity-60' : 'hover:bg-gray-50'}
    >
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${getAvatarColor(item.name)} flex items-center justify-center text-white font-bold text-sm`}
          >
            {(item.name || '').charAt(0).toUpperCase()}
          </div>
          <span className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
            {item.name}
          </span>
        </div>
      </td>
      <td className={`px-6 py-4 text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-600'}`}>
        {item.email}
      </td>
      <td className={`px-6 py-4 text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-600'}`}>
        {item.company}
      </td>
      <td className="px-6 py-4 text-sm">
        {getStatusBadge(item.status || 'Active')}
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-900 p-1 disabled:opacity-50"
            disabled={userRole === 'employee'}
            title="Edit customer"
          >
            <Edit2 size={18} />
          </button>
          {userRole !== 'employee' && (
            <button
              onClick={() => handleToggleStatus(item)}
              className={`p-1 ${
                item.status === 'Disabled'
                  ? 'text-green-600 hover:text-green-900'
                  : 'text-red-600 hover:text-red-900'
              }`}
              title={item.status === 'Disabled' ? 'Enable customer' : 'Disable customer'}
            >
              <Ban size={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">Manage your customer relationships</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                status: 'Active',
              });
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} /> Add Customer
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No customers found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'Add your first customer to get started'}
            </p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Active customers first */}
                {activeItems.map((item) => (
                  <CustomerRow key={item.id} item={item} isDisabled={false} />
                ))}
                {/* Disabled customers at the bottom */}
                {disabledItems.map((item) => (
                  <CustomerRow key={item.id} item={item} isDisabled={true} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={userRole === 'employee' && !!editingItem}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={userRole === 'employee' && !!editingItem}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={userRole === 'employee' && !!editingItem}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={userRole === 'employee' && !!editingItem}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={userRole === 'employee' && !!editingItem}
                >
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (userRole === 'employee' && !!editingItem)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
