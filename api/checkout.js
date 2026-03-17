/**
 * api/checkout.js — Vercel serverless function
 * Maakt een Stripe Checkout Session aan voor maandelijks of jaarlijks abonnement.
 *
 * POST body: { plan: 'monthly' | 'yearly', userId: string, email: string }
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRIJZEN = {
  monthly: {
    naam:        'Groeiboek Premium — Maandelijks',
    unit_amount: 299,          // €2,99 in centen
    interval:    'month',
  },
  yearly: {
    naam:        'Groeiboek Premium — Jaarlijks',
    unit_amount: 2499,         // €24,99 in centen
    interval:    'year',
  },
};

const BASE_URL = process.env.BASE_URL || 'https://groeiboek.vercel.app';

module.exports = async (req, res) => {
  // CORS headers zodat de browser de fetch mag doen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode niet toegestaan' });

  const { plan = 'monthly', userId, email } = req.body || {};

  const prijs = PRIJZEN[plan] || PRIJZEN.monthly;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      mode: 'subscription',
      client_reference_id: userId || null,
      customer_email:       email  || undefined,
      locale:               'nl',
      line_items: [
        {
          price_data: {
            currency:     'eur',
            product_data: { name: prijs.naam },
            unit_amount:  prijs.unit_amount,
            recurring:    { interval: prijs.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/dashboard.html?betaald=true`,
      cancel_url:  `${BASE_URL}/dashboard.html`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
