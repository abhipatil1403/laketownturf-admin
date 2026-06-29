const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

if (getApps().length === 0) {
  const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVar) {
    try {
      const serviceAccount = JSON.parse(envVar);
      initializeApp({ credential: cert(serviceAccount) });
    } catch (err) {}
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { slotId, date, startTime, endTime } = JSON.parse(event.body);
    if (!slotId) return { statusCode: 400, headers, body: 'Missing slotId' };

    const db = getFirestore();
    const messaging = getMessaging();
    const waitlistRef = db.collection('waitlists').doc(slotId);
    const waitlistSnap = await waitlistRef.get();

    if (waitlistSnap.exists) {
      const uids = waitlistSnap.data().uids || [];
      const tokens = [];
      for (const uid of uids) {
        const userSnap = await db.collection('users').doc(uid).get();
        if (userSnap.exists && userSnap.data().fcmToken) {
          tokens.push(userSnap.data().fcmToken);
        }
      }

      if (tokens.length > 0) {
        const dateArr = date ? date.split('-') : [];
        const formattedDate = dateArr.length === 3 ? `${dateArr[2]}-${dateArr[1]}-${dateArr[0]}` : date;
        
        const formatTime = (t) => {
          if(!t) return '';
          const [h, m] = t.split(':').map(Number);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hr = h % 12 || 12;
          return `${hr}:${m === 0 ? '00' : m} ${ampm}`;
        };

        const wlTitle = 'Slot Available!';
        const wlBody = `A slot you were waiting for on ${formattedDate} from ${formatTime(startTime)} - ${formatTime(endTime)} is now open. Book quickly!`;

        await messaging.sendEachForMulticast({
          notification: { title: wlTitle, body: wlBody },
          tokens: tokens,
          data: { link: 'laketownturf://home' }
        });
      }
      // Clear the waitlist so they aren't notified again
      await waitlistRef.delete();
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Waitlist notification error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
