const firebaseAdminModule = require('firebase-admin');
const admin = firebaseAdminModule.default || firebaseAdminModule;

// Initialize Firebase Admin SDK once
const apps = admin.apps || [];
if (apps.length === 0) {
  const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVar) {
    try {
      const serviceAccount = JSON.parse(envVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', err.message);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT env variable is not set.');
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { token, title, body, data } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'FCM token is required' }) };
    }

    const currentApps = admin.apps || [];
    if (currentApps.length === 0) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT env variable.' }) };
    }

    const message = {
      notification: {
        title: title || 'Notification',
        body: body || '',
      },
      token: token,
    };
    if (data) message.data = data;

    const response = await admin.messaging().send(message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, response }),
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send notification', details: error.message }),
    };
  }
};
