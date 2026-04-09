export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'subscription',
        'customer_email': email,
        'line_items[0][price]': 'price_1TKM5E9dNz5jPKuXFw3xpZTo',
        'line_items[0][quantity]': '1',
        'success_url': `${process.env.APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}`,
        'cancel_url': `${process.env.APP_URL}/signup`,
        'metadata[user_id]': userId,
        'subscription_data[metadata][user_id]': userId
      }).toString()
    });

    const session = await response.json();
    if (session.error) throw new Error(session.error.message);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
