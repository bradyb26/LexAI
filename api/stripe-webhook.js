export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Verify webhook signature
    const crypto = await import('crypto');
    const payload = JSON.stringify(req.body);
    const elements = sig.split(',');
    const timestamp = elements.find(e => e.startsWith('t=')).substring(2);
    const signatures = elements.filter(e => e.startsWith('v1=')).map(e => e.substring(3));
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto.default.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

    if (!signatures.includes(expectedSig)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    event = req.body;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
        });
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ subscription_status: 'inactive' })
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
