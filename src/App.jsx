import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import UsersPage from './pages/UsersPage';
import SlotsPage from './pages/SlotsPage';
import BookingsPage from './pages/BookingsPage';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Verify admin status with realtime listener
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setIsAdmin(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-darkNavy flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : (isAdmin ? <Navigate to="/users" /> : <div className="min-h-screen bg-darkNavy flex items-center justify-center text-textSecondary">Configuring admin access... Please wait.</div>)} 
        />
        
        {/* Protected Admin Routes */}
        <Route 
          path="/" 
          element={user && isAdmin ? <AdminLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/users" />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="slots" element={<SlotsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
