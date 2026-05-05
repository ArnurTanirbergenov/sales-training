// api/analyze.js
// POST /api/analyze
// Body: { text: string, mode: 'full'|'summary', productFacts: string }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, mode, productFacts } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini key not configured' });

  const systemPrompt = `Ты — эксперт-тренер по продажам недвижимости с 15-летним опытом.

Информация об объекте:
${productFacts || ''}

Проанализируй ${mode === 'full' ? 'транскрипт' : 'пересказ'} звонка.

Ответь СТРОГО в JSON без markdown:
{
  "overall_score": число 1-10,
  "outcome": "назначен показ" | "оформлена бронь" | "клиент ушёл думать" | "отказ" | "неизвестно",
  "phases": [
    {
      "name": "название этапа",
      "status": "ok" | "warn" | "bad",
      "what_was_said": "цитата или краткое описание",
      "comment": "конкретный комментарий",
      "alternatives": ["альтернативная фраза 1", "альтернативная фраза 2"]
    }
  ],
  "scores": {
    "rapport": число,
    "needs_discovery": число,
    "objection_handling": число,
    "closing": число
  },
  "score_labels": ["Установление контакта", "Выявление потребностей", "Работа с возражениями", "Закрытие"],
  "key_mistake": "главная ошибка одним предложением",
  "key_strength": "главная сильная сторона одним предложением",
  "summary": "вывод 2-3 предложения с рекомендациями"
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Вот ${mode === 'full' ? 'транскрипт' : 'пересказ'} звонка:\n\n${text}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
