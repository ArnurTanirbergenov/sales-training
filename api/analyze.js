// api/analyze.js — call analysis with SPIN framework
// POST /api/analyze
// Body: { text, mode, productFacts }

import { openai, safeParseJSON } from './_openai.js';

function buildSystem(mode, productFacts) {
  return `Ты — эксперт-тренер по продажам национальных блюд и сервисов для мероприятий (Qazaq Grill). Анализируешь звонки по методологиям SPIN Selling, FAB, LAER.

ИНФОРМАЦИЯ О ПРОДУКТЕ:
${productFacts || ''}

ЗАДАНИЕ: Проанализируй ${mode === 'full' ? 'транскрипт' : 'пересказ'} звонка по продаже запечённого барашка, рёбрышек, сёмги, индейки, бешбармака и других блюд Qazaq Grill.
Дай честный конкретный разбор. Альтернативные фразы — реальные скрипты для менеджера по продажам еды и мероприятий.

ОТВЕТЬ СТРОГО В JSON БЕЗ MARKDOWN, БЕЗ КОММЕНТАРИЕВ, ТОЛЬКО JSON. 
ВАЖНО: Все поля должны быть заполнены. Не оставляй значения пустыми.

СТРУКТУРА JSON:
{
  "overall_score": число 1-10,
  "outcome": "оформлен заказ" | "клиент ушёл думать" | "отказ" | "неизвестно",
  "phases": [
    {
      "name": "название этапа",
      "status": "ok" | "warn" | "bad",
      "what_was_said": "что сказал менеджер",
      "comment": "оценка с конкретикой",
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
  "spin_assessment": {
    "situation_questions": "оценка S-вопросов",
    "problem_questions": "оценка P-вопросов",
    "implication_questions": "оценка I-вопросов",
    "need_payoff_questions": "оценка N-вопросов"
  },
  "key_mistake": "ОБЯЗАТЕЛЬНО: главная ошибка одним предложением",
  "key_strength": "ОБЯЗАТЕЛЬНО: главная сильная сторона одним предложением",
  "missed_opportunity": "какой момент упущен и как надо было",
  "summary": "итоговый вывод 2-3 предложения"
}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, mode, productFacts } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const raw = await openai({
      system: buildSystem(mode, productFacts),
      messages: [{ role: 'user', content: `Вот ${mode === 'full' ? 'транскрипт' : 'пересказ'} звонка:\n\n${text.slice(0, 6000)}` }],
      maxTokens: 2500, // Kept exactly as requested
      temperature: 0.6
    });

    const parsed = safeParseJSON(raw);

    // --- FALLBACK FIX FOR GOOGLE SHEETS ---
    // This ensures that the columns in Google Sheets are NEVER empty
    const finalResult = {
      ...parsed,
      key_mistake: parsed.key_mistake || "Ошибка не определена (ИИ не выделил конкретную ошибку)",
      key_strength: parsed.key_strength || "Сильная сторона не определена (ИИ не выделил конкретный плюс)",
      summary: parsed.summary || "Анализ завершен, но итоговый вывод отсутствует",
      overall_score: parsed.overall_score || 0,
      outcome: parsed.outcome || "неизвестно"
    };

    return res.status(200).json(finalResult);
  } catch (err) {
    console.error('Analyze Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
