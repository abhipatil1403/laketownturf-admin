const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { paymentId, amount } = JSON.parse(event.body);

    if (!paymentId || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment ID and Amount are required' })
      };
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T7Pfr9lEHrS3ft',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'yju0uwCZkhJPGpJ81Sa4Jkc9',
    });

    const refund = await instance.payments.refund(paymentId, {
      amount: amount * 100 // convert to paise
    });

    return {
      statusCode: 200,
      body: JSON.stringify(refund)
    };
  } catch (error) {
    console.error('Error creating Razorpay refund:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
