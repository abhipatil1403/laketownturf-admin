const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { paymentId, amount } = JSON.parse(event.body);

    if (!paymentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'paymentId is required' })
      };
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {};
    if (amount) {
      options.amount = amount * 100; // refund amount in paise
    }

    const refund = await instance.payments.refund(paymentId, options);

    return {
      statusCode: 200,
      body: JSON.stringify(refund)
    };
  } catch (error) {
    console.error('Error processing Razorpay refund:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};