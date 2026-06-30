import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format } from 'date-fns';
import { db } from '../firebase';
import { Users, Calendar, DollarSign, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    todayBookings: 0,
    todayRevenue: 0,
  });
  const [chartData, setChartData] = useState([]);
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
          if (data.status?.toLowerCase() === 'pending') pending++;
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
        if (data.status?.toLowerCase() === 'confirmed') {
          bookings++;
          revenue += (data.amount || 0);
        }
      });
      setStats(s => ({ ...s, todayBookings: bookings, todayRevenue: revenue }));
      setLoading(false);
    });

    const fetchChartData = async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
      const q = query(collection(db, 'bookings'), where('date', 'in', last7Days));
      const snap = await getDocs(q);
      
      const revenueMap = {};
      last7Days.forEach(date => revenueMap[date] = 0);
      
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status?.toLowerCase() === 'confirmed' && revenueMap[data.date] !== undefined) {
          revenueMap[data.date] += (data.amount || 0);
        }
      });
      
      setChartData(last7Days.map(date => ({
        name: format(new Date(date), 'MMM dd'),
        revenue: revenueMap[date]
      })));
    };
    
    fetchChartData();

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

      <div className="bg-darkNavySurface border border-cardBorder rounded-xl p-6 shadow-lg h-96">
        <h2 className="text-lg font-bold text-textPrimary mb-6">Revenue - Last 7 Days</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1DB954" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
            <XAxis dataKey="name" stroke="#A0AEC0" axisLine={false} tickLine={false} />
            <YAxis stroke="#A0AEC0" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748', borderRadius: '8px' }}
              itemStyle={{ color: '#1DB954', fontWeight: 'bold' }}
              formatter={(value) => [`₹${value}`, 'Revenue']}
            />
            <Area type="monotone" dataKey="revenue" stroke="#1DB954" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
