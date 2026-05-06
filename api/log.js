// api/notify.js — Telegram notifications
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chatId, text } = req.body;

  // 1. Basic Validation
  if (!chatId || !text) {
    return res.status(400).json({ error: 'chatId and text are required' });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) {
    console.error('Config Error: TELEGRAM_BOT_TOKEN is missing from environment variables');
    return res.status(500).json({ error: 'Telegram token not configured' });
  }

  // 2. HTML Escaping Helper
  // Telegram's parse_mode: 'HTML' fails if the text contains <, >, or & 
  // unless they are part of a valid tag. We escape them to be safe.
  const escapeHTML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  try {
    // We escape the text first, then you can manually add <b> or <i> 
    // if you are building the string in the frontend.
    // For now, this ensures the message ALWAYS sends.
    const safeText = escapeHTML(text);

    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: safeText, 
        parse_mode: 'HTML' 
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API Error:', data.description);
      return res.status(400).json({ 
        error: `Telegram API Error: ${data.description}`,
        detail: data 
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram Network/System Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
