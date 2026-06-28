const { initializeApp, cert, getApps } = require('firebase-admin/app');
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
    const { token, tokens, title, body, data } = JSON.parse(event.body);

    if (!token && (!tokens || tokens.length === 0)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'FCM token(s) required' }) };
    }

    if (getApps().length === 0) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Firebase Admin not initialized.' }) };
    }

    if (tokens && tokens.length > 0) {
      const message = {
        notification: {
          title: title || 'Notification',
          body: body || '',
        },
        tokens: tokens,
      };
      if (data) message.data = data;

      const response = await getMessaging().sendEachForMulticast(message);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, response }),
      };
    } else {
      const message = {
        notification: {
          title: title || 'Notification',
          body: body || '',
        },
        token: token,
      };
      if (data) message.data = data;

      const response = await getMessaging().send(message);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, response }),
      };
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send notification', details: error.message }),
    };
  }
};
