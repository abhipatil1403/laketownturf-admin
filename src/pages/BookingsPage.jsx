import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Search, AlertTriangle, IndianRupee, Users, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfToday } from 'date-fns';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending_verification'); // 'pending_verification', 'upcoming', 'past', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  // Cancellation Modal State
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherReason, setCancelOtherReason] = useState('');

  const PREDEFINED_REASONS = [
    'Maintenance dues not cleared',
    'Not a verified resident of the society',
    'Turf under maintenance / Slot unavailable',
    'Other'
  ];

  const formatTime12hr = (time24) => {
    try {
      const [h, m] = time24.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12; 
      return `${hour}:${m} ${ampm}`;
    } catch (e) {
      return time24;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch Users to map UID to Name/FlatNo
      const usersSnap = await getDocs(collection(db, 'users'));
      const uMap = {};
      usersSnap.forEach(doc => {
        uMap[doc.data().uid] = doc.data();
      });
      setUsersMap(uMap);

      // 2. Fetch Bookings
      const bookingsQ = query(collection(db, 'bookings'), orderBy('timestamp', 'desc'));
      const bookingsSnap = await getDocs(bookingsQ);
      
      const bList = [];
      bookingsSnap.forEach(doc => {
        bList.push({ id: doc.id, ...doc.data() });
      });
      
      setBookings(bList);
    } catch (err) {
      console.error(err);
      setError('Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus, reason = null) => {
    try {
      const updateData = { status: newStatus };
      if (reason) {
        updateData.cancellationReason = reason;
      }
      
      const booking = bookings.find(b => b.id === bookingId);

      if (newStatus === 'cancelled' && bookingId.startsWith('booking_')) {
        // Copy to a new auto-ID document to free up the "lock" document for the slot
        const cancelledRef = doc(collection(db, 'bookings'));
        if (booking) {
          const { id, ...dataToSave } = booking;
          await setDoc(cancelledRef, {
            ...dataToSave,
            ...updateData
          });
        }
        await deleteDoc(doc(db, 'bookings', bookingId));
      } else {
        await updateDoc(doc(db, 'bookings', bookingId), updateData);
      }
      
      // Send Push Notification
      if (booking) {
        const user = usersMap[booking.uid];
        if (user && user.fcmToken) {
          let title = 'Booking Update';
          let body = 'Your booking status has been updated.';
          
          if (newStatus === 'confirmed') {
            title = 'Booking Confirmed!';
            body = `Your turf booking on ${format(parseISO(booking.date), 'dd-MM-yyyy')} has been confirmed.`;
          } else if (newStatus === 'cancelled') {
            title = 'Booking Cancelled';
            body = `Your turf booking on ${format(parseISO(booking.date), 'dd-MM-yyyy')} was cancelled by the admin.`;
            if (reason) {
              body += ` Reason: ${reason}`;
            }
          }
          
          fetch('/.netlify/functions/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: user.fcmToken, title, body })
          }).catch(err => console.error('Notification error:', err));
        }
      }

      await fetchData(); // Refresh
    } catch (err) {
      console.error(err);
      setError("Failed to update booking.");
    }
  };

  const getFilteredBookings = () => {
    let filtered = bookings;
    
    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(b => {
        const user = usersMap[b.uid];
        const name = user?.name?.toLowerCase() || '';
        const flat = user?.flatNo?.toLowerCase() || '';
        return name.includes(lowerQuery) || flat.includes(lowerQuery) || b.date.includes(lowerQuery);
      });
    }

    // Time filter
    const today = startOfToday();
    if (filter === 'pending_verification') {
      filtered = filtered.filter(b => b.status === 'pending_verification');
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(b => {
        try {
          return !isBefore(parseISO(b.date), today) && b.status !== 'pending_verification';
        } catch(e) { return true; }
      });
    } else if (filter === 'past') {
      filtered = filtered.filter(b => {
        try {
          return isBefore(parseISO(b.date), today) && b.status !== 'pending_verification';
        } catch(e) { return false; }
      });
    }

    // Sort by date descending
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    return filtered;
  };

  const filteredBookings = getFilteredBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Bookings</h1>
        <p className="text-textSecondary mt-1">Manage, verify, and track all turf reservations.</p>
      </div>

      {error && (
        <div className="p-4 bg-dangerRed/10 border border-dangerRed/20 rounded-lg flex items-start space-x-3 text-dangerRed">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap bg-darkNavySurface border border-cardBorder rounded-lg p-1 gap-1">
          <button 
            onClick={() => setFilter('pending_verification')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending_verification' ? 'bg-amberCTA text-darkNavy' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            Pending Verification
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'upcoming' ? 'bg-primaryGreen text-darkNavy' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'past' ? 'bg-primaryGreen text-darkNavy' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            Past
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primaryGreen text-darkNavy' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            All
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, flat, or date..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 bg-darkNavySurface border border-cardBorder rounded-lg pl-10 pr-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-darkNavySurface border border-cardBorder rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-darkNavy border-b border-cardBorder text-xs uppercase tracking-wider text-textSecondary">
                <th className="py-4 px-6 font-semibold">Booked By</th>
                <th className="py-4 px-6 font-semibold">Slot Info</th>
                <th className="py-4 px-6 font-semibold">Payment</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-textSecondary">
                    <Calendar size={48} className="mx-auto text-textSecondary/50 mb-4" />
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const user = usersMap[booking.uid];
                  const isExpanded = expandedBookingId === booking.id;
                  
                  return (
                    <React.Fragment key={booking.id}>
                      <tr className="hover:bg-darkNavy/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-medium text-textPrimary">{user?.name || 'Unknown User'}</div>
                          <div className="text-xs text-textSecondary mt-0.5">{user?.flatNo || '-'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-textPrimary font-medium">
                            {format(parseISO(booking.date), 'dd-MM-yyyy')}
                          </div>
                          <div className="text-sm text-textSecondary">
                            {formatTime12hr(booking.startTime)} - {formatTime12hr(booking.endTime)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center text-textPrimary font-bold">
                            <IndianRupee size={14} className="mr-0.5" />
                            {booking.amount}
                          </div>
                          <span className="text-xs text-primaryGreen font-medium uppercase tracking-wide">
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                            booking.status === 'confirmed' 
                              ? 'bg-primaryGreen/10 text-primaryGreen border border-primaryGreen/20'
                              : booking.status === 'cancelled'
                              ? 'bg-dangerRed/10 text-dangerRed border border-dangerRed/20'
                              : booking.status === 'pending_verification'
                              ? 'bg-amberCTA/10 text-amberCTA border border-amberCTA/20'
                              : 'bg-darkNavy text-textSecondary border border-cardBorder'
                          }`}>
                            {booking.status === 'pending_verification' ? 'Pending' : booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                            className="text-sm text-primaryGreen hover:underline font-medium transition-colors"
                          >
                            {isExpanded ? 'Hide Details' : 'View Roster'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Roster View */}
                      {isExpanded && (
                        <tr className="bg-darkNavy/50">
                          <td colSpan="5" className="py-6 px-6 border-b border-cardBorder">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <h4 className="flex items-center text-sm font-bold text-textPrimary mb-3 uppercase tracking-wider">
                                  <Users size={16} className="mr-2" /> Resident Players
                                </h4>
                                <div className="space-y-2">
                                  {booking.players?.length > 0 ? (
                                    booking.players.map((p, i) => (
                                      <div key={i} className="flex justify-between bg-darkNavySurface p-2 rounded border border-cardBorder">
                                        <span className="text-sm text-textPrimary">{p.name}</span>
                                        <span className="text-xs text-textSecondary mt-0.5">{p.blockNo ? `${p.blockNo}-${p.flatNo}` : `Flat ${p.flatNo}`}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-textSecondary italic">No additional players.</div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="flex items-center text-sm font-bold text-textPrimary mb-3 uppercase tracking-wider">
                                  <Users size={16} className="mr-2" /> Guest Passes
                                </h4>
                                <div className="space-y-2">
                                  {booking.guests?.length > 0 ? (
                                    booking.guests.map((g, i) => (
                                      <div key={i} className="flex justify-between bg-darkNavySurface p-2 rounded border border-cardBorder">
                                        <span className="text-sm text-textPrimary">{g.name}</span>
                                        <span className="text-xs font-bold text-primaryGreen mt-0.5">₹100</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-textSecondary italic">No guests.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Verification Actions */}
                            {booking.status === 'pending_verification' && (
                              <div className="mt-8 pt-4 border-t border-cardBorder flex justify-end space-x-4">
                                <button
                                  onClick={() => {
                                    setCancellingBookingId(booking.id);
                                    setCancelReason(PREDEFINED_REASONS[0]);
                                    setCancelOtherReason('');
                                  }}
                                  className="flex items-center px-4 py-2 bg-darkNavy border border-dangerRed text-dangerRed rounded hover:bg-dangerRed hover:text-white transition-colors"
                                >
                                  <XCircle size={16} className="mr-2" />
                                  Reject Booking
                                </button>
                                <button
                                  onClick={() => {
                                    if(window.confirm("Approve this booking? Receipts will be generated.")) updateBookingStatus(booking.id, 'confirmed');
                                  }}
                                  className="flex items-center px-4 py-2 bg-primaryGreen text-darkNavy font-bold rounded hover:bg-opacity-90 transition-colors"
                                >
                                  <CheckCircle size={16} className="mr-2" />
                                  Approve Booking
                                </button>
                              </div>
                            )}
                            
                            {booking.status === 'confirmed' && (
                              <div className="mt-8 pt-4 border-t border-cardBorder flex justify-end">
                                <button
                                  onClick={() => {
                                    setCancellingBookingId(booking.id);
                                    setCancelReason(PREDEFINED_REASONS[0]);
                                    setCancelOtherReason('');
                                  }}
                                  className="text-sm text-dangerRed hover:underline font-medium transition-colors"
                                >
                                  Force Cancel Booking
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-darkNavySurface border border-cardBorder rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-textPrimary mb-2 flex items-center">
              <AlertTriangle className="text-dangerRed mr-2" size={24} />
              Cancel Booking
            </h3>
            <p className="text-textSecondary text-sm mb-4">
              Please provide a reason for cancelling this booking. This will be sent to the user.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-darkNavy border border-cardBorder rounded-lg p-2.5 text-textPrimary focus:outline-none focus:border-dangerRed transition-colors"
                >
                  {PREDEFINED_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {cancelReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Specific Reason</label>
                  <textarea
                    value={cancelOtherReason}
                    onChange={(e) => setCancelOtherReason(e.target.value)}
                    placeholder="Enter the specific reason for denial..."
                    className="w-full bg-darkNavy border border-cardBorder rounded-lg p-2.5 text-textPrimary focus:outline-none focus:border-dangerRed transition-colors min-h-[80px] resize-y"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setCancellingBookingId(null)}
                className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  const finalReason = cancelReason === 'Other' ? cancelOtherReason.trim() : cancelReason;
                  if (cancelReason === 'Other' && !finalReason) {
                    alert("Please enter a specific reason.");
                    return;
                  }
                  updateBookingStatus(cancellingBookingId, 'cancelled', finalReason);
                  setCancellingBookingId(null);
                }}
                className="px-4 py-2 bg-dangerRed text-white font-bold rounded hover:bg-opacity-90 transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
