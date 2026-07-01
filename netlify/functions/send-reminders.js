const { schedule } = require('@netlify/functions');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

// Initialize Firebase Admin SDK once
if (getApps().length === 0) {
  const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVar) {
    try {
      const serviceAccount = JSON.parse(envVar);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize Firebase Admin:', err.message);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT env variable is not set.');
  }
}

const handler = async (event) => {
  console.log("Running scheduled reminder check...");
  if (getApps().length === 0) {
    console.error('Firebase Admin not initialized. Exiting.');
    return { statusCode: 500 };
  }

  const db = getFirestore();
  const messaging = getMessaging();
  const now = new Date();
  
  try {
    // Generate IST date strings for today and tomorrow to handle timezone overlaps
    const todayStr = new Date(now.getTime() + 5.5 * 60 * 60000).toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 29.5 * 60 * 60000).toISOString().split('T')[0];
    
    // Fetch all confirmed bookings for today and tomorrow
    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'CONFIRMED')
      .where('date', 'in', [todayStr, tomorrowStr])
      .get();
      
    const promises = [];
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      const remindersSent = booking.remindersSent || {};
      
      // Legacy support: if the old flag is set, assume 30/15 are done to prevent duplicate spam
      if (booking.reminderSent === true && Object.keys(remindersSent).length === 0) {
        remindersSent.thirtyMin = true;
        remindersSent.fifteenMin = true;
      }

      // Parse slotId, e.g., 'slot_16_0' -> hour 16, min 0
      const slotParts = booking.slotId.split('_');
      if (slotParts.length < 3) return;
      const hour = parseInt(slotParts[1], 10);
      const min = parseInt(slotParts[2], 10);
      
      const [year, month, day] = booking.date.split('-').map(Number);
      
      // Calculate UTC time of the slot start (assuming the slot time is in IST)
      const slotStartTimeUTC = new Date(Date.UTC(year, month - 1, day, hour - 5, min - 30));
      
      const timeDiffMs = slotStartTimeUTC.getTime() - now.getTime();
      const timeDiffMins = timeDiffMs / 60000;
      
      let reminderType = null;
      let title = '';
      let body = '';
      
      const formattedHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const formattedMin = min === 0 ? '00' : min;
      const amPm = hour >= 12 ? 'PM' : 'AM';
      const timeString = `${formattedHour}:${formattedMin} ${amPm}`;

      // Check which time window we are in
      if (timeDiffMins > 0 && timeDiffMins <= 15 && !remindersSent.fifteenMin) {
        reminderType = 'fifteenMin';
        title = 'Match Starts Soon! ⚽🏃‍♂️';
        body = `Get ready! Your turf slot starts in ${Math.round(timeDiffMins)} minutes!`;
      } else if (timeDiffMins > 15 && timeDiffMins <= 30 && !remindersSent.thirtyMin) {
        reminderType = 'thirtyMin';
        title = 'Turf Slot in 30 Mins ⏰';
        body = `Time to lace up! Your match starts in ${Math.round(timeDiffMins)} minutes.`;
      } else if (timeDiffMins > 1400 && timeDiffMins <= 1440 && !remindersSent.twentyFourHour) {
        reminderType = 'twentyFourHour';
        title = 'Tomorrow\'s Turf Booking 📅';
        body = `Just a heads-up! Your slot is booked for tomorrow at ${timeString}.`;
      }

      if (reminderType) {
        promises.push((async () => {
          try {
            // Fetch user to get FCM token
            const userDoc = await db.collection('users').doc(booking.uid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              if (userData.fcmToken) {
                await messaging.send({
                  token: userData.fcmToken,
                  notification: { title, body },
                  data: { link: "laketownturf://bookings" }
                });
                console.log(`[${reminderType}] sent to user ${booking.uid} for slot ${booking.slotId}`);
              }
            }
            
            // Mark this specific reminder as sent
            await db.collection('bookings').doc(doc.id).update({
              [`remindersSent.${reminderType}`]: true
            });
            
          } catch (e) {
            console.error(`Failed to process ${reminderType} reminder for booking ${doc.id}:`, e);
          }
        })());
      }
    });
    
    await Promise.all(promises);
    return { statusCode: 200 };
  } catch (error) {
    console.error("Error in reminder scheduled function:", error);
    return { statusCode: 500 };
  }
};

exports.handler = schedule('*/5 * * * *', handler);
