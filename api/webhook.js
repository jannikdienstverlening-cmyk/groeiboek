/**
 * api/webhook.js — Vercel serverless function
 * Verwerkt Stripe webhook events.
 * Vereist STRIPE_WEBHOOK_SECRET in environment.
 *
 * Zet in Stripe Dashboard:
 *   Endpoint URL: https://groeiboek.vercel.app/api/webhook
 *   Events: checkout.session.completed, customer.subscription.deleted
 */

const stripe        = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Raw body nodig voor handtekeningverificatie — bodyParser uitschakelen
module.exports.config = { api: { bodyParser: false } };

// Helper: lees raw body als Buffer
function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig  = req.headers['stripe-signature'];
  const body = await rawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook handtekening ongeldig:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Supabase admin client (service role key omzeilt RLS)
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId  = session.client_reference_id;
      const email   = session.customer_details?.email || session.customer_email;
      const plan    = session.amount_total <= 299 ? 'monthly' : 'yearly';

      // Geldig tot: 1 maand of 1 jaar
      const geldigTot = new Date();
      if (plan === 'yearly') geldigTot.setFullYear(geldigTot.getFullYear() + 1);
      else geldigTot.setMonth(geldigTot.getMonth() + 1);

      const { error } = await sb.from('abonnementen').upsert({
        user_id:           userId,
        email,
        plan,
        stripe_customer_id: session.customer,
        stripe_session_id:  session.id,
        actief:            true,
        geldig_tot:        geldigTot.toISOString(),
      }, { onConflict: 'user_id' });

      if (error) console.error('Supabase upsert fout:', error.message);
      else console.log(`Abonnement opgeslagen voor user ${userId}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub      = event.data.object;
      const customer = sub.customer;

      const { error } = await sb
        .from('abonnementen')
        .update({ actief: false })
        .eq('stripe_customer_id', customer);

      if (error) console.error('Supabase update fout:', error.message);
      break;
    }

    default:
      console.log(`Onverwerkt event: ${event.type}`);
  }

  res.status(200).json({ ontvangen: true });
};
