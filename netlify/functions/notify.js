import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const handler = async (event, context) => {
  // Basic CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. Safely load firebase-admin inside the handler
    const admin = require('firebase-admin');

    // 2. Initialize if not already done
    if (!admin.apps || admin.apps.length === 0) {
      const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!envVar) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT is completely missing from Netlify env variables' }) };
      }
      
      const serviceAccount = JSON.parse(envVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    // 3. Parse Request
    const { token, title, body, data } = JSON.parse(event.body);
    if (!token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'FCM token is required' }) };
    }

    // 4. Send Message
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
    console.error('Error in notify function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Function crashed', details: error.message, stack: error.stack }),
    };
  }
};
