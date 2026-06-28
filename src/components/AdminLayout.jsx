import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, Calendar, Clock, LogOut, Shield } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Users', path: '/users', icon: <Users size={20} /> },
    { name: 'Slots', path: '/slots', icon: <Clock size={20} /> },
    { name: 'Bookings', path: '/bookings', icon: <Calendar size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-darkNavy text-textPrimary">
      {/* Sidebar */}
      <aside className="w-64 bg-darkNavySurface border-r border-cardBorder flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-cardBorder">
          <Shield className="text-primaryGreen mr-3" size={24} />
          <h1 className="text-xl font-bold">Turf Admin</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primaryGreen/10 text-primaryGreen'
                    : 'text-textSecondary hover:bg-darkNavy hover:text-textPrimary'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-cardBorder">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left text-dangerRed hover:bg-dangerRed/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
