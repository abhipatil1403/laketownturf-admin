import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, Search } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Revocation Modal State
  const [revokingUserId, setRevokingUserId] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeOtherReason, setRevokeOtherReason] = useState('');

  const PREDEFINED_REVOKE_REASONS = [
    'Maintenance dues not cleared',
    'Not a verified resident of the society',
    'Violation of turf rules',
    'Other'
  ];

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

  const handleUpdateStatus = async (userId, newStatus, reason = null) => {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = { status: newStatus };
      if (reason && newStatus === 'rejected') {
        updateData.revocationReason = reason;
      }
      await updateDoc(userRef, updateData);

      // Send Push Notification
      const user = users.find(u => u.id === userId);
      if (user && user.fcmToken) {
        const title = newStatus === 'active' ? 'Account Approved!' : 'Access Revoked';
        let body = newStatus === 'active' 
          ? 'Your Lake Town Turf account has been approved. You can now book slots!'
          : 'Your account access has been revoked/rejected.';
        
        if (reason && newStatus === 'rejected') {
          body += ` Reason: ${reason}`;
        }
          
        fetch('/.netlify/functions/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: user.fcmToken, title, body, data: { link: 'laketownturf://profile' } })
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

  const getFilteredUsers = () => {
    let filtered = users.filter(u => u.role !== 'admin');
    
    // Sort by creation time (newest first)
    filtered.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      
      if (timeA === timeB) {
        // Fallback: sort pending users to the top
        const isAPending = (a.status || 'pending').toLowerCase() === 'pending';
        const isBPending = (b.status || 'pending').toLowerCase() === 'pending';
        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;
        
        // Final fallback: alphabetical by name
        return (a.name || '').localeCompare(b.name || '');
      }
      return timeB - timeA;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => {
        return (u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.phone?.toLowerCase().includes(q) ||
                u.flatNo?.toLowerCase().includes(q) ||
                u.type?.toLowerCase().includes(q) ||
                (u.status || 'pending').toLowerCase().includes(q));
      });
    }
    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">User Management</h2>
          <p className="text-textSecondary mt-1">Approve or reject turf registrations.</p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-darkNavySurface border border-cardBorder rounded-lg text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
          />
          <Search className="absolute left-3 top-2.5 text-textSecondary" size={18} />
        </div>
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-textSecondary">No users found matching your search.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
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
                        onClick={() => {
                          setRevokingUserId(user.id);
                          setRevokeReason(PREDEFINED_REVOKE_REASONS[0]);
                          setRevokeOtherReason('');
                        }}
                        className="p-2 text-dangerRed hover:bg-dangerRed/10 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  )}
                  {statusStr === 'active' && (
                    <button
                      onClick={() => {
                        setRevokingUserId(user.id);
                        setRevokeReason(PREDEFINED_REVOKE_REASONS[0]);
                        setRevokeOtherReason('');
                      }}
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
                );
              })
            )}
            
          </tbody>
        </table>
      </div>

      {/* Revocation Modal */}
      {revokingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-darkNavySurface border border-cardBorder rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-textPrimary mb-2 flex items-center">
              <XCircle className="text-dangerRed mr-2" size={24} />
              Revoke User Access
            </h3>
            <p className="text-textSecondary text-sm mb-4">
              Please provide a reason for rejecting or revoking this user. This will be shown to them in the app.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Reason</label>
                <select
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-darkNavy border border-cardBorder rounded-lg p-2.5 text-textPrimary focus:outline-none focus:border-dangerRed transition-colors"
                >
                  {PREDEFINED_REVOKE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {revokeReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Specific Reason</label>
                  <textarea
                    value={revokeOtherReason}
                    onChange={(e) => setRevokeOtherReason(e.target.value)}
                    placeholder="Enter the specific reason for revocation..."
                    className="w-full bg-darkNavy border border-cardBorder rounded-lg p-2.5 text-textPrimary focus:outline-none focus:border-dangerRed transition-colors min-h-[80px] resize-y"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setRevokingUserId(null)}
                className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  const finalReason = revokeReason === 'Other' ? revokeOtherReason.trim() : revokeReason;
                  if (revokeReason === 'Other' && !finalReason) {
                    alert("Please enter a specific reason.");
                    return;
                  }
                  handleUpdateStatus(revokingUserId, 'rejected', finalReason);
                  setRevokingUserId(null);
                }}
                className="px-4 py-2 bg-dangerRed text-white font-bold rounded hover:bg-opacity-90 transition-colors"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
