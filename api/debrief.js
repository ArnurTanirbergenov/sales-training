// api/debrief.js
// POST /api/debrief
// Body: { transcript: string, scenario: string, difficulty: string,
//         success: bool, productFacts: string }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, scenario, difficulty, success, productFacts } = req.body;

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini key not configured' });

  const systemPrompt = `Ты — тренер по продажам недвижимости. Дай честный разбор тренировочного диалога.

Объект: ${productFacts || ''}
Сценарий: ${scenario}
Сложность: ${difficulty}
Итог: ${success ? 'УСПЕХ' : 'НЕУДАЧА'}

Диалог:
${transcript}

Ответь в JSON без markdown:
{
  "scores": {
    "rapport": число 1-10,
    "needs_discovery": число 1-10,
    "argumentation": число 1-10,
    "objections": число 1-10,
    "closing": число 1-10
  },
  "total": число 1-10,
  "moments": [
    {
      "type": "good" | "bad" | "tip",
      "text": "конкретный момент",
      "alternative": "альтернативная фраза (только для bad)"
    }
  ],
  "verdict": "вывод 1-2 предложения",
  "next_focus": "совет на следующую тренировку"
}
Включи 4-6 моментов.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Проведи разбор.' }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
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
