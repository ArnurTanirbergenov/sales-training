export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, scenario, difficulty, success, productFacts } = req.body;

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini key not configured' });

  // Системный промпт - только правила и роль
  const systemPrompt = `Ты — тренер по продажам недвижимости. Дай честный разбор тренировочного диалога. Выдели 4-6 ключевых моментов. Оцени навыки по 10-балльной шкале.`;

  // Данные пользователя собираем в отдельную строку
  const userData = `
Объект: ${productFacts || 'Не указан'}
Сценарий: ${scenario || 'Не указан'}
Сложность: ${difficulty || 'Не указана'}
Итог: ${success ? 'УСПЕХ' : 'НЕУДАЧА'}

Диалог:
${transcript}
  `;

  try {
    const geminiRes = await fetch(
      `[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$){GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Передаем транскрипт как сообщение пользователя
          contents: [{ role: 'user', parts: [{ text: userData }] }],
          // Передаем правила как системную инструкцию
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { 
            maxOutputTokens: 1500, 
            temperature: 0.7,
            responseMimeType: "application/json", // Гарантирует чистый JSON без markdown
            // Опционально: здесь можно передать responseSchema для 100% гарантии структуры
          }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Парсим без replace, так как responseMimeType отдает чистый JSON
    const parsed = JSON.parse(raw); 
    return res.status(200).json(parsed);

  } catch (err) {
    // Если JSON.parse всё-таки упадет или будет сетевая ошибка
    console.error("Debrief API Error:", err);
    return res.status(500).json({ error: "Ошибка при разборе ответа от ИИ." });
  }
}