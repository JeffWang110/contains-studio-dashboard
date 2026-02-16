// Vercel Serverless Function - Feedback email relay via Resend
// 路徑: /api/feedback.js

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 分鐘
const RATE_LIMIT_MAX = 6; // 每個 IP 在 10 分鐘最多 6 次

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { startTime: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count += 1;
  return true;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const allowedOrigins = [
    'https://party.jeffwang.work',
    'https://agents.jeffwang.work',
    'https://contains-studio-app.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: '送出過於頻繁，請稍後再試。' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const website = typeof body.website === 'string' ? body.website.trim() : '';

    // Honeypot: bots 通常會填寫隱藏欄位，直接視為成功以降低重試。
    if (website) {
      return res.status(200).json({ success: true });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ error: '請完整填寫必填欄位。' });
    }

    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `姓名不可超過 ${MAX_NAME_LENGTH} 字。` });
    }

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: '請提供有效的 Email。' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `回饋內容不可超過 ${MAX_MESSAGE_LENGTH} 字。` });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
    const toEmail = process.env.FEEDBACK_TO_EMAIL || 'jeff110@cht.com.tw';

    if (!resendApiKey || !fromEmail) {
      console.error('Missing RESEND_API_KEY or FEEDBACK_FROM_EMAIL');
      return res.status(500).json({ error: '回饋服務暫時無法使用。' });
    }

    const createdAt = new Date().toISOString();
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `Contains Studio 意見回饋 - ${name}`,
        reply_to: email,
        text: [
          'Contains Studio 收到新的意見回饋',
          `姓名: ${name}`,
          `Email: ${email}`,
          `時間: ${createdAt}`,
          '',
          '回饋內容:',
          message,
        ].join('\n'),
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.7;">
            <h2 style="margin:0 0 16px;">Contains Studio 收到新的意見回饋</h2>
            <p style="margin:4px 0;"><strong>姓名：</strong>${escapedName}</p>
            <p style="margin:4px 0;"><strong>Email：</strong>${escapedEmail}</p>
            <p style="margin:4px 0 16px;"><strong>時間：</strong>${createdAt}</p>
            <p style="margin:0 0 8px;"><strong>回饋內容：</strong></p>
            <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
              ${escapedMessage}
            </div>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend API Error:', resendError);
      return res.status(502).json({ error: '信件發送失敗，請稍後再試。' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Feedback API Error:', error);
    return res.status(500).json({ error: '伺服器發生錯誤，請稍後再試。' });
  }
}
