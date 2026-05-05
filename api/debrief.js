// api/debrief.js — training debrief with 5-skill scorecard
// POST /api/debrief
// Body: { transcript, scenario, difficulty, success, productFacts }

import { openai, safeParseJSON } from './_openai.js';

function buildSystem(scenario, difficulty, success, productFacts) {
  return `Ты — старший тренер по продажам недвижимости. Дай честный, конкретный, мотивирующий разбор тренировки.

СЦЕНАРИЙ: ${scenario}
СЛОЖНОСТЬ: ${difficulty}
ИТОГ: ${success ? 'УСПЕХ — клиент согласился' : 'НЕУДАЧА — клиент не согласился'}

ОБЪЕКТ:
${productFacts || ''}

ОЦЕНИВАЙ 5 НАВЫКОВ (каждый 1-10):
1. rapport — установление контакта и доверия
2. needs_discovery — выявление потребностей (SPIN-вопросы)
3. argumentation — презентация с привязкой к боли клиента (FAB)
4. objections — работа с возражениями (LAER)
5. closing — закрытие на конкретный следующий шаг

ОТВЕТЬ СТРОГО В JSON БЕЗ MARKDOWN:
{
  "scores": {
    "rapport": число,
    "needs_discovery": число,
    "argumentation": число,
    "objections": число,
    "closing": число
  },
  "total": число,
  "moments": [
    {
      "type": "good" | "bad" | "tip",
      "text": "конкретное описание со ссылкой на слова менеджера",
      "alternative": "фраза которую можно выучить (только для bad, иначе пустая строка)"
    }
  ],
  "spin_used": {
    "situation": true или false,
    "problem": true или false,
    "implication": true или false,
    "need_payoff": true или false
  },
  "talk_ratio": "менеджер говорил примерно X% времени",
  "best_phrase": "лучшая фраза менеджера дословно или близко к тексту",
  "worst_phrase": "самый слабый момент — описание",
  "verdict": "честный вывод 2 предложения",
  "next_focus": "один конкретный навык для следующей тренировки с объяснением"
}

Включи 5-7 моментов (минимум 2 good, минимум 2 bad).
Ссылайся на конкретные слова из диалога.`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, scenario, difficulty, success, productFacts } = req.body;

  try {
    const raw = await openai({
      system: buildSystem(scenario, difficulty, success, productFacts),
      messages: [{ role: 'user', content: `Диалог тренировки:\n\n${(transcript || '').slice(0, 5000)}` }],
      maxTokens: 2000,
      temperature: 0.6
    });
    const parsed = safeParseJSON(raw);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
