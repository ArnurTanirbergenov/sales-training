// api/check.js — invite token verification
import { timingSafeEqual } from 'crypto';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.body;
  const valid = process.env.INVITE_TOKEN;
  if (!valid) return res.status(500).json({ ok: false });
  const a = Buffer.from(token || '');
  const b = Buffer.from(valid);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return res.status(200).json({ ok });
}
