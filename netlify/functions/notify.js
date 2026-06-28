import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This requires the FIREBASE_SERVICE_ACCOUNT environment variable to be set in Netlify
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT env variable is empty or not set.");
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", error);
  }
}

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Basic CORS headers in case the request comes from local dev
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  try {
    const { token, title, body, data } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'FCM token is required' }),
      };
    }

    if (!admin.apps.length) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Firebase Admin not initialized. Check environment variables.' }),
      };
    }

    const message = {
      notification: {
        title: title || 'Notification',
        body: body || '',
      },
      token: token,
    };

    if (data) {
      message.data = data;
    }

    // Send the message using the Firebase Admin SDK
    const response = await admin.messaging().send(message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, response }),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send notification', details: error.message }),
    };
  }
};
