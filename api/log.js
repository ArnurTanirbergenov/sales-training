// api/log.js
// POST /api/log
// Body: { ...данные сессии }
// Пробрасывает данные в Google Apps Script → Google Sheets

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
  if (!SHEETS_URL) return res.status(500).json({ error: 'Sheets URL not configured' });

  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    return res.status(200).json({ ok: true });

  } catch (err) {
    // Не фейлим UI если Sheets недоступен
    console.error('Sheets log error:', err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
