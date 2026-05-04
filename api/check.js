// api/check.js
// POST /api/check
// Body: { token: string }
// Проверяет токен доступа — значение хранится только на сервере в env
// Чтобы сменить ссылку: измените INVITE_TOKEN в Vercel → Redeploy

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body;
  const validToken = process.env.INVITE_TOKEN;

  if (!validToken) {
    // Если переменная не задана — доступ закрыт
    return res.status(500).json({ ok: false, error: 'Token not configured' });
  }

  // Простое сравнение без timing attack (через crypto)
  const { timingSafeEqual } = await import('crypto');
  const a = Buffer.from(token || '');
  const b = Buffer.from(validToken);

  const ok = a.length === b.length && timingSafeEqual(a, b);
  return res.status(200).json({ ok });
}
