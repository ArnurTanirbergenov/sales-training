export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, systemPrompt, maxTokens = 2048 } = req.body;

  if (!messages || !systemPrompt) {
    return res.status(400).json({ error: 'messages and systemPrompt required' });
  }

  // Не забудьте добавить этот ключ в ваш файл .env
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Anthropic key not configured' });

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest', 
        max_tokens: maxTokens,
        system: systemPrompt, 
        temperature: 0.7,
        messages: messages.map(m => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
          content: m.content
        }))
      })
    });

    const data = await anthropicRes.json();

    // Обработка ошибок от API Anthropic
    if (data.type === 'error') {
      return res.status(500).json({ error: data.error.message });
    }

    // Парсинг успешного ответа
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}