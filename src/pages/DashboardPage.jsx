import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Calendar, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    todayBookings: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let total = 0;
      let pending = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role !== 'admin') {
          total++;
          if (data.status === 'PENDING') pending++;
        }
      });
      setStats(s => ({ ...s, totalUsers: total, pendingUsers: pending }));
    });

    const qBookings = query(collection(db, 'bookings'), where('date', '==', today));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      let bookings = 0;
      let revenue = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'CONFIRMED') {
          bookings++;
          revenue += (data.amount || 0);
        }
      });
      setStats(s => ({ ...s, todayBookings: bookings, todayRevenue: revenue }));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubBookings();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Today's Revenue", value: `₹${stats.todayRevenue}`, icon: <DollarSign size={24} />, color: "text-primaryGreen", bg: "bg-primaryGreen/10" },
    { title: "Today's Bookings", value: stats.todayBookings, icon: <Calendar size={24} />, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Users", value: stats.totalUsers, icon: <Users size={24} />, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Pending Approvals", value: stats.pendingUsers, icon: <Clock size={24} />, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textPrimary">Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-darkNavySurface border border-cardBorder rounded-xl p-6 flex items-center space-x-4 hover:border-primaryGreen/50 transition-colors shadow-lg">
            <div className={`p-4 rounded-lg ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-textSecondary text-sm font-medium">{card.title}</p>
              <h3 className="text-2xl font-bold text-textPrimary">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-darkNavySurface border border-cardBorder rounded-xl p-6 mt-8 shadow-lg">
        <h2 className="text-lg font-bold text-textPrimary mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/users" className="block text-center p-4 bg-darkNavy rounded-lg border border-cardBorder hover:border-primaryGreen transition-all hover:-translate-y-1 text-textPrimary font-medium shadow-md hover:shadow-primaryGreen/20">
            Manage Users
          </Link>
          <Link to="/slots" className="block text-center p-4 bg-darkNavy rounded-lg border border-cardBorder hover:border-primaryGreen transition-all hover:-translate-y-1 text-textPrimary font-medium shadow-md hover:shadow-primaryGreen/20">
            Configure Slots
          </Link>
          <Link to="/bookings" className="block text-center p-4 bg-darkNavy rounded-lg border border-cardBorder hover:border-primaryGreen transition-all hover:-translate-y-1 text-textPrimary font-medium shadow-md hover:shadow-primaryGreen/20">
            View Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
