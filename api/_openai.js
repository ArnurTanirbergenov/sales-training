// api/_openai.js — shared OpenAI helper

export async function openai({ system, messages, maxTokens = 1200, temperature = 0.85 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured in environment variables');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini', // Kept exactly as requested
        max_completion_tokens: maxTokens, // Kept exactly as requested
        temperature,
        messages: [
          { role: 'system', content: system },
          ...messages
        ]
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API Error: ${res.status}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    
    if (!choice) throw new Error('No response choice returned from OpenAI');

    // Detect truncation
    if (choice.finish_reason === 'length') {
      throw new Error('GPT ответ был обрезан из-за лимита токенов. Попробуйте сократить ввод или увеличьте лимит.');
    }

    return choice.message?.content || '';
  } catch (err) {
    console.error('OpenAI Helper Error:', err.message);
    throw err;
  }
}

// Safe JSON parser — strips markdown fences, auto-closes truncated JSON
export function safeParseJSON(raw) {
  if (!raw) return {};
  
  // Remove markdown code blocks (```json ... ```)
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Attempt to fix truncated JSON by closing open brackets/quotes
    try {
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
    } catch (finalErr) {
      console.error('JSON Parse Error:', finalErr.message);
      throw new Error('Не удалось распознать ответ от ИИ как JSON. Пожалуйста, попробуйте еще раз.');
    }
  }
}
