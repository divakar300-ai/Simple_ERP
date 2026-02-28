import React from 'react';
import { Menu } from 'lucide-react';

const Header = ({ title, userRole, onMenuToggle }) => {
  const getRoleBadgeStyles = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-indigo-100 text-indigo-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30 md:ml-64 ml-16">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title || 'Dashboard'}</h1>
        </div>

        {/* Right: Role Badge */}
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeStyles(
              userRole
            )}`}
          >
            {userRole === 'admin' ? 'Admin' : 'Employee'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
