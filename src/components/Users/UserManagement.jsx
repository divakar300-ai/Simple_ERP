import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Users, Loader, Search, ChevronDown } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AuthContext } from '../../contexts/AuthContext';

const UserManagement = () => {
  const { userRole, user } = React.useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all users from Firestore
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(u =>
    (u.displayName || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle role change
  const handleRoleChange = async (userId, currentRole) => {
    // Prevent user from changing their own role
    if (userId === user?.uid) {
      setError('You cannot change your own role');
      return;
    }

    const newRoleValue = currentRole === 'admin' ? 'employee' : 'admin';
    setSelectedUser({ ...selectedUser, id: userId });
    setNewRole(newRoleValue);
    setShowRoleModal(true);
  };

  // Handle status change
  const handleStatusChange = async (userId) => {
    if (userId === user?.uid) {
      setError('You cannot disable your own account');
      return;
    }

    const userToUpdate = users.find(u => u.id === userId);
    const newStatusValue = userToUpdate?.status === 'active' ? 'disabled' : 'active';
    setSelectedUser({ ...selectedUser, id: userId });
    setNewStatus(newStatusValue);
    setShowStatusModal(true);
  };

  // Confirm and update role
  const confirmRoleUpdate = async () => {
    try {
      setUpdating(true);
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date()
      });

      // Update local state
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));

      setSuccess(`User role updated to ${newRole}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  // Confirm and update status
  const confirmStatusUpdate = async () => {
    try {
      setUpdating(true);
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, status: newStatus } : u
      ));

      setSuccess(`User status changed to ${newStatus}`);
      setShowStatusModal(false);
      setSelectedUser(null);
      setNewStatus('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update user status');
    } finally {
      setUpdating(false);
    }
  };

  // Close modals on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowRoleModal(false);
        setShowStatusModal(false);
        setSelectedUser(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">Manage user roles and account status</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((userItem) => {
                  const isCurrentUser = userItem.id === user?.uid;
                  const isDisabled = userItem.status === 'disabled';

                  return (
                    <tr
                      key={userItem.id}
                      className={isDisabled ? 'bg-gray-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{userItem.displayName || userItem.name || 'N/A'}</span>
                          {isCurrentUser && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              You
                            </span>
                          )}
                          {isDisabled && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{userItem.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            userItem.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {userItem.role === 'admin' ? (
                            <Shield className="w-4 h-4" />
                          ) : (
                            <ShieldOff className="w-4 h-4" />
                          )}
                          {userItem.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            userItem.status === 'active' || !userItem.status
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {userItem.status === 'active' || !userItem.status ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {userItem.createdAt
                          ? (userItem.createdAt.toDate ? userItem.createdAt.toDate().toLocaleDateString() : new Date(userItem.createdAt).toLocaleDateString())
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRoleChange(userItem.id, userItem.role)}
                            disabled={isCurrentUser || updating}
                            title={isCurrentUser ? 'Cannot change your own role' : 'Change user role'}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isCurrentUser || updating
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {userItem.role === 'admin' ? 'Make Employee' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(userItem.id)}
                            disabled={isCurrentUser || updating}
                            title={isCurrentUser ? 'Cannot change your own status' : 'Toggle user status'}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isCurrentUser || updating
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isDisabled
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Users Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change User Role</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change this user's role to <strong>{newRole}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole('');
                }}
                disabled={updating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleUpdate}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {updating ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change Account Status</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to{' '}
              <strong>
                {newStatus === 'disabled' ? 'disable' : 'enable'}
              </strong>
              {' '}this user account?
            </p>
            {newStatus === 'disabled' && (
              <p className="text-sm text-orange-600 mb-6 bg-orange-50 p-3 rounded">
                The user will not be able to log in.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedUser(null);
                  setNewStatus('');
                }}
                disabled={updating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={updating}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 ${
                  newStatus === 'disabled'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {updating ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {updating ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
