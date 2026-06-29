const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, receipt } = JSON.parse(event.body);

    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount is required' })
      };
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await instance.orders.create(options);

    return {
      statusCode: 200,
      body: JSON.stringify(order)
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
