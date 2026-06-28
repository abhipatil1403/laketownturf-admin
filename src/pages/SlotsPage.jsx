import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, IndianRupee, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format, addDays, subDays, startOfDay, getDay } from 'date-fns';

export default function SlotsPage() {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Fetch slots whenever the date changes
  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate]);

  const fetchSlots = async (dateObj) => {
    setIsLoading(true);
    setError('');
    try {
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const dayOfWeek = getDay(dateObj); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      
      // 1. Generate Virtual Slots
      let virtualSlots = [];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (dayOfWeek === 1) {
        // Monday: Closed
      } else if (!isWeekend) {
        // Tuesday to Friday: 7-8 PM (19:00 - 20:00), 200 Rs
        virtualSlots.push({
          slotId: `${dateStr}-19:00`,
          date: dateStr,
          startTime: "19:00",
          endTime: "20:00",
          price: 200,
          isBooked: false,
          bookedBy: null
        });
      } else {
        // Saturday and Sunday: Morning (7-11 AM), Evening (4-8 PM), 300 Rs
        const morningHours = [7, 8, 9, 10];
        morningHours.forEach(h => {
          const sTime = `${h.toString().padStart(2, '0')}:00`;
          virtualSlots.push({
            slotId: `${dateStr}-${sTime}`,
            date: dateStr,
            startTime: sTime,
            endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
            price: 300,
            isBooked: false,
            bookedBy: null
          });
        });

        const eveningHours = [16, 17, 18, 19];
        eveningHours.forEach(h => {
          const sTime = `${h.toString().padStart(2, '0')}:00`;
          virtualSlots.push({
            slotId: `${dateStr}-${sTime}`,
            date: dateStr,
            startTime: sTime,
            endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
            price: 300,
            isBooked: false,
            bookedBy: null
          });
        });
      }

      // 2. Fetch overrides (price changes or manual blocks by admin)
      const overridesQ = query(collection(db, 'slots'), where('date', '==', dateStr));
      const overridesSnap = await getDocs(overridesQ);
      const overrides = {};
      overridesSnap.forEach(doc => overrides[doc.id] = doc.data());

      // 3. Fetch bookings
      const bookingsQ = query(collection(db, 'bookings'), where('date', '==', dateStr));
      const bookingsSnap = await getDocs(bookingsQ);
      const bookings = {};
      bookingsSnap.forEach(doc => bookings[doc.data().slotId] = doc.data());

      // 4. Merge
      const finalSlots = virtualSlots.map(vSlot => {
        const override = overrides[vSlot.slotId];
        const booking = bookings[vSlot.slotId];
        
        return {
          ...vSlot,
          price: override?.price !== undefined ? override.price : vSlot.price,
          isBooked: !!booking,
          bookedBy: booking ? booking.uid : null,
          hasOverride: !!override
        };
      });
      
      // Sort by start time
      finalSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      setSlots(finalSlots);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch slots.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async (slot, newPrice) => {
    try {
      // Save an override document to Firestore
      const docRef = doc(db, 'slots', slot.slotId);
      await setDoc(docRef, {
        slotId: slot.slotId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: parseFloat(newPrice)
      }, { merge: true });
      
      await fetchSlots(selectedDate);
    } catch (err) {
      console.error(err);
      setError("Failed to update price.");
    }
  };
  
  const handleResetPrice = async (slotId) => {
      try {
        await deleteDoc(doc(db, 'slots', slotId));
        await fetchSlots(selectedDate);
      } catch (err) {
        console.error(err);
        setError("Failed to reset price.");
      }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Slots Management</h1>
        <p className="text-textSecondary mt-1">View turf availability and override pricing.</p>
      </div>

      {error && (
        <div className="p-4 bg-dangerRed/10 border border-dangerRed/20 rounded-lg flex items-start space-x-3 text-dangerRed">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Date Picker Controls */}
      <div className="bg-darkNavySurface border border-cardBorder rounded-xl p-4 flex items-center justify-between">
        <button 
          onClick={() => {
            const prev = subDays(selectedDate, 1);
            if (prev >= startOfDay(new Date())) setSelectedDate(prev);
          }}
          disabled={selectedDate <= startOfDay(new Date())}
          className="p-2 hover:bg-darkNavy rounded-lg text-textSecondary disabled:opacity-30 transition-colors"
        >
          Previous Day
        </button>
        
        <div className="flex items-center space-x-3">
          <Calendar className="text-primaryGreen" size={24} />
          <h2 className="text-xl font-bold text-textPrimary">
            {format(selectedDate, 'dd-MM-yyyy')}
          </h2>
        </div>
        
        <button 
          onClick={() => {
            const next = addDays(selectedDate, 1);
            if (next <= addDays(startOfDay(new Date()), 6)) setSelectedDate(next);
          }}
          disabled={selectedDate >= addDays(startOfDay(new Date()), 6)}
          className="p-2 hover:bg-darkNavy rounded-lg text-textSecondary disabled:opacity-30 transition-colors"
        >
          Next Day
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div>
          {getDay(selectedDate) === 1 ? (
             <span className="text-amberCTA text-sm font-medium flex items-center"><AlertTriangle size={16} className="mr-2"/> Turf is closed on Mondays</span>
          ) : (
             <span className="text-textSecondary text-sm">
               {getDay(selectedDate) === 0 || getDay(selectedDate) === 6 
                  ? "Weekend Schedule: Morning 7-11 AM, Evening 4-8 PM (₹300)" 
                  : "Weekday Schedule: Evening 7-8 PM (₹200)"}
             </span>
          )}
        </div>
      </div>

      {/* Slots Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-20 text-center bg-darkNavySurface border border-cardBorder rounded-xl">
          <Clock size={48} className="mx-auto text-textSecondary/50 mb-4" />
          <h3 className="text-lg font-medium text-textPrimary">Turf Closed</h3>
          <p className="text-textSecondary mt-1">There are no slots scheduled for this day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slots.map(slot => (
            <div 
              key={slot.slotId} 
              className={`bg-darkNavySurface border rounded-xl overflow-hidden transition-all ${
                slot.isBooked ? 'border-cardBorder' : 'border-primaryGreen/30 hover:border-primaryGreen'
              }`}
            >
              <div className={`p-4 border-b ${slot.isBooked ? 'border-cardBorder bg-darkNavy/30' : 'border-primaryGreen/10 bg-primaryGreen/5'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-textPrimary">{formatTime12hr(slot.startTime)} - {formatTime12hr(slot.endTime)}</h3>
                    <div className="flex items-center mt-1 text-sm text-textSecondary">
                      <IndianRupee size={14} className="mr-1" />
                      {slot.price}
                      {slot.hasOverride && <span className="ml-2 text-xs text-amberCTA bg-amberCTA/10 px-1.5 py-0.5 rounded">Custom Price</span>}
                    </div>
                  </div>
                  {slot.isBooked ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dangerRed/10 text-dangerRed border border-dangerRed/20">
                      <XCircle size={14} className="mr-1" /> Booked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primaryGreen/10 text-primaryGreen border border-primaryGreen/20">
                      <CheckCircle size={14} className="mr-1" /> Available
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-darkNavySurface space-y-4">
                {slot.isBooked ? (
                  <div className="text-sm">
                    <span className="text-textSecondary">Booked by UID: </span>
                    <span className="text-textPrimary font-medium font-mono bg-darkNavy px-2 py-1 rounded text-xs">{slot.bookedBy}</span>
                  </div>
                ) : (
                  <div className="text-sm text-textSecondary">No booking yet</div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-cardBorder">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-textSecondary">Edit Price:</span>
                    <input 
                      type="number" 
                      defaultValue={slot.price}
                      onBlur={(e) => {
                        if (e.target.value && parseFloat(e.target.value) !== slot.price) {
                          handleUpdatePrice(slot, e.target.value);
                        }
                      }}
                      className="w-20 bg-darkNavy border border-cardBorder rounded px-2 py-1 text-sm text-textPrimary focus:outline-none focus:border-primaryGreen"
                    />
                  </div>
                  
                  {slot.hasOverride && (
                    <button 
                      onClick={() => handleResetPrice(slot.slotId)}
                      className="text-xs text-amberCTA hover:underline"
                    >
                      Reset Price
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
