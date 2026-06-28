import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: newStatus
      });

      // Send Push Notification
      const user = users.find(u => u.id === userId);
      if (user && user.fcmToken) {
        const title = newStatus === 'active' ? 'Account Approved!' : 'Account Update';
        const body = newStatus === 'active' 
          ? 'Your Lake Town Turf account has been approved. You can now book slots!'
          : 'Your account access has been revoked/rejected.';
          
        fetch('/.netlify/functions/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: user.fcmToken, title, body })
        }).catch(err => console.error('Notification error:', err));
      }
    } catch (error) {
      console.error("Error updating user status: ", error);
      alert("Failed to update user status.");
    }
  };

  if (loading) {
    return <div className="text-textSecondary">Loading users...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-textPrimary">User Management</h2>
        <p className="text-textSecondary mt-1">Approve or reject turf registrations.</p>
      </div>

      <div className="bg-darkNavySurface border border-cardBorder rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-darkNavy/50 border-b border-cardBorder text-textSecondary text-sm uppercase tracking-wider">
              <th className="py-4 px-6 font-medium">Name</th>
              <th className="py-4 px-6 font-medium">Contact</th>
              <th className="py-4 px-6 font-medium">Flat / Type</th>
              <th className="py-4 px-6 font-medium">Status</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cardBorder">
            {users.filter(u => u.role !== 'admin').map((user) => {
              const statusStr = (user.status || 'pending').toLowerCase();
              return (
              <tr key={user.id} className="hover:bg-darkNavy/30 transition-colors">
                <td className="py-4 px-6">
                  <div className="font-medium text-textPrimary">{user.name}</div>
                  <div className="text-sm text-textSecondary">{user.email}</div>
                </td>
                <td className="py-4 px-6 text-textSecondary">{user.phone}</td>
                <td className="py-4 px-6">
                  <div className="text-textPrimary">{user.flatNo}</div>
                  <div className="text-xs text-textSecondary px-2 py-0.5 bg-darkNavy inline-block rounded border border-cardBorder mt-1">
                    {user.type}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                    statusStr === 'active' 
                      ? 'bg-primaryGreen/10 text-primaryGreen border border-primaryGreen/20'
                      : statusStr === 'rejected'
                      ? 'bg-dangerRed/10 text-dangerRed border border-dangerRed/20'
                      : 'bg-amberCTA/10 text-amberCTA border border-amberCTA/20'
                  }`}>
                    {statusStr}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  {statusStr === 'pending' && (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(user.id, 'active')}
                        className="p-2 text-primaryGreen hover:bg-primaryGreen/10 rounded-lg transition-colors tooltip-trigger"
                        title="Approve"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(user.id, 'rejected')}
                        className="p-2 text-dangerRed hover:bg-dangerRed/10 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  )}
                  {statusStr === 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'rejected')}
                      className="text-sm text-dangerRed hover:underline"
                    >
                      Revoke Access
                    </button>
                  )}
                  {statusStr === 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'active')}
                      className="text-sm text-primaryGreen hover:underline"
                    >
                      Grant Access
                    </button>
                  )}
                </td>
              </tr>
            )})}
            
            {users.filter(u => u.role !== 'admin').length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-textSecondary">
                  No users found in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
