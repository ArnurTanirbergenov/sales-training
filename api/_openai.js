// api/_openai.js — shared OpenAI helper (GPT-4.1 mini)

export async function openai({ system, messages, maxTokens = 1200, temperature = 0.85 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured in environment variables');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      max_completion_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: system },
        ...messages
      ]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const choice = data.choices?.[0];
  if (!choice) throw new Error('No response from OpenAI');

  // Detect truncation before caller tries to parse JSON
  if (choice.finish_reason === 'length') {
    throw new Error('GPT ответ был обрезан из-за лимита токенов. Попробуйте короче или сообщите администратору.');
  }

  return choice.message?.content || '';
}

// Safe JSON parser — strips markdown fences, auto-closes truncated JSON
export function safeParseJSON(raw) {
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Count unclosed braces/brackets and close them
    let depth = 0, inStr = false, esc = false;
    for (const ch of clean) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
      }
    }
    if (inStr) clean += '"';
    while (depth > 0) { clean += '}'; depth--; }
    return JSON.parse(clean);
  }
}
