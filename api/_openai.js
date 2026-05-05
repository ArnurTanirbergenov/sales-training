

export async function openai({ system, messages, maxTokens = 500, temperature = 0.85 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured in environment variables');

  const body = {
    model: 'gpt-5.4-mini',
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: system },
      ...messages
    ]
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}
