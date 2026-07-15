// index_payment.js

// import paymentHandler from '../crypto/payment_handler.js';
import { db } from '../shared/db.js';
import { app, createUserPayment, jwtAuth } from './index_middleware.js';
import {r_endpoint} from '../shared/endpoints.js';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs'; 
import bcrypt from 'bcrypt';

// Define the path to the .env file depending on your current working directory
const repoEnvPath = path.resolve(process.cwd(), '.env');
const adjacentEnvPath = path.resolve(process.cwd(), '../easyjobapps/.env'); 
const envPath = fs.existsSync(repoEnvPath) ? repoEnvPath : adjacentEnvPath; 
dotenv.config({ path: envPath }); 

let url = r_endpoint() 
const stripeSecretKey = url == 'http://localhost:3002' ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_SECRET_KEY

// Payment Routes
app.post('/notify-payment', jwtAuth, async (req, res) => {
  console.log('\x1b[35m%s\x1b[0m', 'notify-payment')
  try {
    await paymentHandler.notifyPayment(req, res);
    await paymentHandler.verifyPayments(); // Verify payments after notifying
    res.json({ success: true, data : { message: 'Payment notification received and verified' } });
  } catch (error) {
    res.status(500).json({ success: false, data : { message: 'Internal server error' } });
  }
});

app.get('/get-payments', jwtAuth, (req, res) => {
  console.log('\x1b[35m%s\x1b[0m', 'get-payments')
  try {
    const payments = paymentHandler.getPayments(req.user);
    res.json({ success: true, data : {  payments: payments } });
  } catch (error) {
    res.status(500).json({ success: false, data : {  message: 'Internal server error' } });
  }
});

app.post('/verify-payments', jwtAuth, async (req, res) => {
  console.log('\x1b[35m%s\x1b[0m', 'verify-payments')
  try {
    await paymentHandler.verifyPayments();
    res.json({ success: true, data : { message: 'Payments verified'} });
  } catch (error) {
    res.status(500).json({ success: false, data : {  message: 'Internal server error' } });
  }
});

  

import express from 'express';  
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the payment page
app.get('/stripe/payment', (req, res) => {
  console.log('\x1b[35m%s\x1b[0m', 'Stripe payment route accessed');
    res.send(`
        <html>
        <body>
            <h1>Buy AI Credits</h1> 
            <form action="./purchase" method="POST">
              <input style={{display:'none'}} type="text" name="sidepanel" value="true" readOnly/> 
              <input style={{display:'none'}} type="text" name="credits" value="50" readOnly/> 
              <input style={{display:'none'}} type="text" name="username" value=test123 readOnly/> 
              <button type="submit">Purchase $.5 AI Credits</button>
            </form>
        </body>
        </html>
    `);
});

// Handle the purchase using fetch
app.post('/stripe/purchase', async (req, res) => { 
  // check for username in body 
  // 100 == 1$

  let username = req.body.username;
  let purchase = req.body.purchase;
  let sidepanel = req.body.sidepanel;
  console.log('\x1b[35m%s\x1b[0m', 'STRIPE/PURCHASE: User ID:', username, purchase );
    try {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'payment_method_types[]': 'card',
                'line_items[0][price_data][currency]': 'usd',
                'line_items[0][price_data][product_data][name]': 'AI Credits',
                'line_items[0][price_data][unit_amount]': purchase,
                'line_items[0][quantity]': '1',
                'mode': 'payment',
                'success_url': `${url}stripe_status=success&sidepanel=${sidepanel}&username=${username}&session_id={CHECKOUT_SESSION_ID}`,
                'cancel_url': `${url}?stripe_status=false`,
                'metadata[username]': username, 
            }).toString()
        });

        const session = await response.json();
        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).send('Internal Server Error');
    }
});

// A portion of the profits should go back to the end user.

// The 1$ purchase is 1:1 and can only be bought once. 
// $1 =~ 1m credits, $0 Profit. $5 =~ 2m credits, $3.33 profit.
function calculateCredits(paid) { 
  // Price == 3x rule == 1/3rd cost (OpenAI and stripe), 2/3rd Profit.
  const multiplier = 3 // paid <= 100 ? 1 : 3;
  const costShare = paid / multiplier;
  const stripeFee = paid * 0.03 + 30;
  const userPortion = costShare - stripeFee; 
  
  const creditsPerPenny = 1000000 / (60);
  const userCredits = userPortion * creditsPerPenny; 
  
  // Return the total credits the user gets
  return {
      paid: paid,
      credits: userCredits,
      toStripe: stripeFee,
      toOpenAi: userPortion,
      profits: paid - costShare
  };
} 

// Webhook handler for Stripe events. 
// createUserPayment payment create users IFF !exists. 
app.post('/stripe/event', express.raw({ type: 'application/json' }), async (req, res) => { 
  let event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  console.log('\x1b[35m%s\x1b[0m', 'STRIPE/EVENT: TYPE:', event.type );

  // Append to events log.
  const eventsLog = path.join(__dirname, 'stripe_events.txt');
  fs.appendFileSync(eventsLog, `${JSON.stringify(event)}\n`);
  if (event.type != 'checkout.session.completed'){ res.json({ received: true }); return}

  const st = event.data.object;
  const username = st.metadata.username;
  const total = st.amount_total; // in pennies
  const credits = calculateCredits(total); 

  let paymentData = { 
    username,
    status: st.payment_status,
    total: st.amount_total, 
    date: new Date().toISOString(),
    id: st.payment_intent,
    guestPasswordHash: await bcrypt.hash(username, 10),
    credits: credits.credits,
  } 
  console.log('\x1b[35m%s\x1b[0m', 'STRIPE/EVENT: Payment Data:', paymentData);
  
  createUserPayment(paymentData); 
  db.payment(paymentData); 
  res.json({ received: true }); 
});

// Need to check if user exists first
// Need to create user if not exists second
// 

// _id === ?stripe_status=success&session_id=cs_test_a1jwpKsdj9rJ5ACv6sAaTDpqJaepUFeIDBLLx4V2sAeae7tskk67I4zins

// data.object.created, _id,
// data.object.amount_subtotal, _total, 
// data.object.customer_details.email, name, address
// data.object.metadata.username
// data.object.payment_status
// 
/*
{
  "id": "evt_1PpO7x02TlTFOTqchOyUvMXX",
  "object": "event",
  "api_version": "2024-06-20",
  "created": 1724045257,
  "data": {
    "object": {
      "id": "cs_live_a1cwIdOYuncvKeeroKuUd7SQKu2uAillQbGhTqeSGhOnB49xukPIVzimoK",
      "object": "checkout.session",
      "after_expiration": null,
      "allow_promotion_codes": null,
      "amount_subtotal": 50,
      "amount_total": 50,
      "automatic_tax": {
        "enabled": false,
        "liability": null,
        "status": null
      },
      "billing_address_collection": null,
      "cancel_url": "https://easyjobapps.com?stripe_status=false",
      "client_reference_id": null,
      "client_secret": null,
      "consent": null,
      "consent_collection": null,
      "created": 1724045239,
      "currency": "usd",
      "currency_conversion": null,
      "custom_fields": [],
      "custom_text": {
        "after_submit": null,
        "shipping_address": null,
        "submit": null,
        "terms_of_service_acceptance": null
      },
      "customer": null,
      "customer_creation": "if_required",
      "customer_details": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": "20814",
          "state": null
        },
        "email": "charles.karpati@gmail.com",
        "name": "Charles Karpati",
        "phone": null,
        "tax_exempt": "none",
        "tax_ids": []
      },
      "customer_email": null,
      "expires_at": 1724131639,
      "invoice": null,
      "invoice_creation": {
        "enabled": false,
        "invoice_data": {
          "account_tax_ids": null,
          "custom_fields": null,
          "description": null,
          "footer": null,
          "issuer": null,
          "metadata": {},
          "rendering_options": null
        }
      },
      "livemode": true,
      "locale": null,
      "metadata": {
        "username": "uid123"
      },
      "mode": "payment",
      "payment_intent": "pi_3PpO7v02TlTFOTqc1rng2Syt",
      "payment_link": null,
      "payment_method_collection": "if_required",
      "payment_method_configuration_details": null,
      "payment_method_options": {
        "card": {
          "request_three_d_secure": "automatic"
        }
      },
      "payment_method_types": [
        "card"
      ],
      "payment_status": "paid",
      "phone_number_collection": {
        "enabled": false
      },
      "recovered_from": null,
      "saved_payment_method_options": null,
      "setup_intent": null,
      "shipping_address_collection": null,
      "shipping_cost": null,
      "shipping_details": null,
      "shipping_options": [],
      "status": "complete",
      "submit_type": null,
      "subscription": null,
      "success_url": "https://easyjobapps.com/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}",
      "total_details": {
        "amount_discount": 0,
        "amount_shipping": 0,
        "amount_tax": 0
      },
      "ui_mode": "hosted",
      "url": null
    }
  },
  "livemode": true,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
*/
