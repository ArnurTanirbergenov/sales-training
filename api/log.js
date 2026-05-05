// api/log.js — Google Sheets logging
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const URL = process.env.GOOGLE_SHEETS_URL;
  if (!URL) return res.status(200).json({ ok: false, error: 'Sheets URL not configured' });
  try {
    await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Sheets:', err.message);
    return res.status(200).json({ ok: false });
  }
}
