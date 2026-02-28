import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Menu,
  X,
  LogOut,
  Shield,
} from 'lucide-react';

const Sidebar = ({ user, userRole, userDisplayName, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/sales', label: 'Sales Orders', icon: ShoppingCart },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/suppliers', label: 'Suppliers', icon: Truck },
    ...(userRole === 'admin' ? [{ path: '/users', label: 'User Management', icon: Shield }] : []),
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg md:hidden hover:bg-indigo-700"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900 text-slate-300 transition-all duration-300 z-40 ${
          isOpen ? 'w-64' : 'w-16'
        } md:w-64 overflow-y-auto`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
              <Package size={24} className="text-white" />
            </div>
            <span className="hidden md:inline-block font-bold text-white text-lg whitespace-nowrap">
              SimpleERP
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-700 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="hidden md:inline-block text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Section & Logout */}
          <div className="border-t border-slate-700 pt-4 space-y-4">
            {/* User Info - Desktop Only */}
            <div className="hidden md:block">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                User
              </div>
              <div className="text-sm text-slate-200 font-medium truncate">
                {userDisplayName || user?.email || 'User'}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                {userRole === 'admin' ? 'Admin' : 'Employee'}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center md:justify-start gap-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className="hidden md:inline-block">Logout</span>
            </button>

            {/* Branding */}
            <p className="hidden md:block text-xs text-slate-600 text-center mt-3">
              Built by Divakar Dadhich
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Content Offset */}
      <div className="md:ml-64 ml-16" />
    </>
  );
};

export default Sidebar;
