#!/usr/bin/env node
/*
 * Send a correctly signed LINE webhook payload to your Next.js route
 * Usage examples:
 *   BASE_URL=http://localhost:3000 \
 *   LINE_CHANNEL_SECRET=xxxx \
 *   node scripts/webhook/send.js --action profile_show --user U1234567890
 *
 *   # Send a text message event instead
 *   node scripts/webhook/send.js --type message --text เมนู --user U1234567890
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');
const fs = require('fs');

// Load env from .env.local or .env if present (so Windows shells don't need inline env)
try {
  if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
  } else if (fs.existsSync('.env')) {
    require('dotenv').config({ path: '.env' });
  }
} catch {}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SECRET = process.env.LINE_CHANNEL_SECRET || '';
if (!SECRET) {
  console.error('Missing LINE_CHANNEL_SECRET env');
  process.exit(1);
}

const userId = arg('user', 'U_TEST_USER');
const type = arg('type', 'postback'); // postback | message | follow
const action = arg('action', 'profile_show');
const text = arg('text', 'เมนู');
const replyToken = `reply_${Math.random().toString(36).slice(2, 10)}`;

let event;
const now = Date.now();
if (type === 'message') {
  event = {
    type: 'message',
    replyToken,
    timestamp: now,
    source: { type: 'user', userId },
    message: { type: 'text', id: `${now}`, text },
  };
} else if (type === 'follow') {
  event = {
    type: 'follow',
    replyToken,
    timestamp: now,
    source: { type: 'user', userId },
  };
} else {
  // postback default
  event = {
    type: 'postback',
    replyToken,
    timestamp: now,
    source: { type: 'user', userId },
    postback: { data: JSON.stringify({ action }) },
  };
}

const body = JSON.stringify({ destination: 'channel', events: [event] });
const signature = crypto.createHmac('sha256', SECRET).update(body).digest('base64');

async function main() {
  const url = `${BASE_URL.replace(/\/?$/, '')}/api/line/webhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-line-signature': signature,
    },
    body,
  });
  const text = await res.text();
  const ok = res.ok ? 'OK' : `HTTP ${res.status}`;
  console.log(`[send-webhook] ${ok}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

// Node 18+ has global fetch
if (typeof fetch !== 'function') {
  console.error('Global fetch is not available. Use Node 18+ or add node-fetch.');
  process.exit(1);
}

main().catch((e) => {
  console.error('[send-webhook] Error:', e);
  process.exit(1);
});
