import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { AuthContext } from '../../contexts/AuthContext';

const AppLayout = () => {
  const location = useLocation();
  const { user, userRole, userDisplayName, logout } = useContext(AuthContext);

  // Map route paths to page titles
  const getTitleFromPath = (path) => {
    const routes = {
      '/': 'Dashboard',
      '/inventory': 'Inventory',
      '/sales': 'Sales Orders',
      '/customers': 'Customers',
      '/suppliers': 'Suppliers',
      '/users': 'User Management',
    };
    return routes[path] || 'Dashboard';
  };

  const title = getTitleFromPath(location.pathname);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar user={user} userRole={userRole} userDisplayName={userDisplayName} onLogout={handleLogout} />

      {/* Header */}
      <Header title={title} userRole={userRole} />

      {/* Main Content Area */}
      <main className="md:ml-64 ml-16 mt-16 p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
