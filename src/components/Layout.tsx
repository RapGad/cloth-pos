import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Settings, Home, Receipt, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { permissions } from '../utils/permissions.ts';

export const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-20 bg-gray-900 text-white flex flex-col items-center py-6 space-y-8">
        <div className="p-2 bg-blue-600 rounded-lg">
          <span className="font-bold text-xl">POS</span>
        </div>
        
        <nav className="flex-1 flex flex-col space-y-6 w-full items-center">
          <NavLink to="/" icon={<Home />} label="Home" />
          <NavLink to="/sales" icon={<ShoppingCart />} label="Sales" />
          <NavLink to="/inventory" icon={<Package />} label="Inventory" />
          <NavLink to="/transactions" icon={<Receipt />} label="Transactions" />
          {permissions.canAccessReports(currentUser?.role) && (
            <NavLink to="/reports" icon={<BarChart3 />} label="Reports" />
          )}
          {permissions.canAccessSettings(currentUser?.role) && (
            <NavLink to="/settings" icon={<Settings />} label="Settings" />
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="w-full flex flex-col items-center space-y-4 border-t border-gray-700 pt-4">
          <div className="group relative">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer">
              {currentUser?.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute left-14 bottom-0 bg-gray-800 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              <div className="font-semibold">{currentUser?.username}</div>
              <div className="text-gray-400 capitalize">{currentUser?.role}</div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="p-3 rounded-xl hover:bg-red-600 transition-colors group relative flex justify-center"
            title="Logout"
          >
            <LogOut size={20} />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

const NavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="p-3 rounded-xl hover:bg-gray-800 transition-colors group relative flex justify-center">
    {icon}
    <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
      {label}
    </span>
  </Link>
);
