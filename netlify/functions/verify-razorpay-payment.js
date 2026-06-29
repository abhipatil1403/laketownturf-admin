const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'yju0uwCZkhJPGpJ81Sa4Jkc9';

    // Create the expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Payment verified successfully' })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Invalid signature' })
      };
    }
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
