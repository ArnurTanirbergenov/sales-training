# SalesCoach Pro — Инструкция по запуску

## Структура проекта

```
salescoach/
├── package.json
├── vercel.json
├── .env.local          ← ваши ключи (не в git!)
├── .gitignore
├── public/
│   └── index.html      ← весь фронтенд
└── api/
    ├── check.js        ← проверка токена доступа
    ├── chat.js         ← Gemini чат (тренировка)
    ├── analyze.js      ← Gemini анализ звонка
    ├── debrief.js      ← Gemini разбор тренировки
    ├── notify.js       ← Telegram уведомления
    └── log.js          ← Google Sheets логирование
```

---

## Шаг 1 — Получите API ключи

### Gemini API Key
1. Перейдите: https://aistudio.google.com/app/apikey
2. Нажмите "Create API Key"
3. Скопируйте ключ — он начинается с `AIza...`

### Telegram Bot Token
1. Напишите боту **@BotFather** в Telegram
2. Отправьте `/newbot`
3. Придумайте имя и username для бота
4. Скопируйте токен — выглядит как `1234567890:AAF...`

### Как менеджеры получат свой Chat ID
- Каждый менеджер пишет боту **@userinfobot** в Telegram
- Бот пришлёт их Chat ID (число)
- Менеджер вводит это число при первом входе в SalesCoach

### Google Apps Script (для Google Sheets)
1. Откройте Google Таблицу (или создайте новую)
2. Перейдите: **Расширения → Apps Script**
3. Вставьте весь код из блока ниже
4. Нажмите **Deploy → New deployment**
5. Тип: **Web App**
6. Execute as: **Me**
7. Who has access: **Anyone**
8. Нажмите **Deploy**, скопируйте URL

```javascript
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Results");
  if (!sheet) sheet = ss.insertSheet("Results");

  // Заголовки при первом запуске
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Дата", "Тип", "Имя", "Роль", "Объект",
      "Сценарий / Итог", "Общий балл", "Сложность", "Успех",
      "Контакт", "Потребности", "Аргументация", "Возражения", "Закрытие",
      "Главная ошибка", "Сильная сторона",
      "Вывод", "Следующий фокус", "Транскрипт"
    ]);
    // Заморозить заголовок
    sheet.setFrozenRows(1);
  }

  const d = JSON.parse(e.postData.contents);
  const isTraining = d.type === "training";

  sheet.appendRow([
    new Date(d.ts).toLocaleString("ru-RU"),
    isTraining ? "Тренировка" : "Разбор звонка",
    d.name || "",
    d.role || "",
    d.product || "",
    d.scenario || d.outcome || "",
    d.total || d.score || "",
    d.difficulty || "",
    d.success !== undefined ? (d.success ? "Да" : "Нет") : "",
    d.rapport || "",
    d.needs || "",
    d.argumentation || "",
    d.objections || "",
    d.closing || "",
    d.keyMistake || "",
    d.keyStrength || "",
    d.verdict || d.summary || "",
    d.nextFocus || "",
    d.transcript || ""
  ]);

  return ContentService.createTextOutput("OK");
}
```

---

## Шаг 2 — Залейте код на GitHub

```bash
# 1. Создайте репозиторий на github.com (Private!)
#    Назовите его: salescoach

# 2. Инициализируйте git в папке проекта
cd salescoach
git init
git add .
git commit -m "Initial SalesCoach setup"

# 3. Подключите к GitHub и запушьте
git remote add origin https://github.com/ВАШ_ЛОГИН/salescoach.git
git branch -M main
git push -u origin main
```

> ⚠️ Файл `.env.local` не попадёт в git благодаря `.gitignore` — ключи остаются только у вас.

---

## Шаг 3 — Разверните на Vercel

1. Перейдите на **vercel.com** → войдите через GitHub
2. Нажмите **"Add New Project"**
3. Выберите репозиторий **salescoach**
4. Vercel автоматически определит настройки

### Добавьте переменные окружения (Environment Variables):

В разделе **"Environment Variables"** перед деплоем добавьте:

| Имя переменной       | Значение                          |
|---------------------|-----------------------------------|
| `GEMINI_API_KEY`    | ваш Gemini ключ (AIza...)         |
| `TELEGRAM_BOT_TOKEN`| ваш токен бота                    |
| `GOOGLE_SHEETS_URL` | URL из Apps Script деплоя         |
| `INVITE_TOKEN`      | придумайте любое слово (пароль)   |

5. Нажмите **Deploy**
6. Через 1-2 минуты сайт готов!

---

## Шаг 4 — Раздайте ссылку менеджерам

Ссылка для входа выглядит так:
```
https://salescoach-xxxxx.vercel.app
```

Менеджер открывает сайт, вводит **INVITE_TOKEN** (то слово что вы придумали) — и попадает внутрь.

---

## Как сменить ссылку / отозвать доступ

Когда нужно закрыть доступ (например, менеджер уволился):

1. Перейдите в **Vercel Dashboard → ваш проект → Settings → Environment Variables**
2. Измените значение `INVITE_TOKEN` на новое слово
3. Нажмите **Redeploy** (занимает ~30 секунд)
4. Старый токен перестаёт работать
5. Раздайте новый токен только нужным людям

> 💡 Можно также использовать разные токены для разных команд и менять только нужный.

---

## Настройка под свой продукт

Откройте `public/index.html` и найдите объект `PRODUCT` в начале `<script>`:

```javascript
const PRODUCT = {
  companyName:  "Название вашей компании",
  productName:  "Название объекта/продукта",
  productEmoji: "🏢",
  productDesc:  "Краткое описание продукта",
  productTags:  ["Тег 1", "Тег 2"],
  
  // Это самое важное — AI читает это для всех сценариев:
  productFacts: `
    Объект: ...
    Цена: ...
    Преимущества: ...
    Типичные возражения: ...
  `,
  
  scenarios: [
    { id:"cold", icon:"📞", name:"Холодный звонок", desc:"Описание" },
    // добавьте свои сценарии
  ]
};
```

После изменений:
```bash
git add .
git commit -m "Update product config"
git push
```
Vercel автоматически задеплоит обновление.

---

## Безопасность — что где хранится

| Что                  | Где хранится         | Браузер видит? |
|---------------------|---------------------|---------------|
| Gemini API Key      | Vercel env vars      | ❌ Нет         |
| Telegram Bot Token  | Vercel env vars      | ❌ Нет         |
| Google Sheets URL   | Vercel env vars      | ❌ Нет         |
| Invite Token        | Vercel env vars      | ❌ Нет         |
| Имя/роль менеджера  | localStorage         | ✅ Да (своё)   |
| Chat ID Telegram    | localStorage         | ✅ Да (своё)   |

Все API запросы идут через `/api/*` — это серверные функции Vercel (Node.js).
Браузер никогда не получает ключи напрямую.

---

## Дашборд в Google Sheets

После первых тренировок в таблице появятся данные:

| Колонка          | Что там                               |
|-----------------|---------------------------------------|
| Дата            | Когда прошла сессия                   |
| Тип             | Тренировка / Разбор звонка            |
| Имя             | Имя менеджера                         |
| Роль            | Должность                             |
| Объект          | Название продукта                     |
| Сценарий/Итог   | Какой сценарий / итог звонка          |
| Общий балл      | 1-10                                  |
| Контакт         | Оценка установления контакта          |
| Потребности     | Оценка выявления потребностей         |
| Аргументация    | Оценка аргументации                   |
| Возражения      | Оценка работы с возражениями          |
| Закрытие        | Оценка закрытия                       |
| Вывод           | Текстовый фидбек от AI                |
| Транскрипт      | Текст диалога                         |

На основе этих данных можно строить графики прямо в Google Sheets:
- Динамика оценок по менеджеру
- Сравнение команды
- Самые слабые навыки

---

## Часто задаваемые вопросы

**Q: Сколько стоит?**
- Vercel: бесплатный план (Hobby) покрывает небольшую команду
- Gemini: бесплатный tier — 15 запросов/мин, 1500/день (достаточно для 5-10 менеджеров)
- При росте: Gemini Pay-as-you-go ~$0.075 за 1M токенов (очень дёшево)

**Q: Можно ли ограничить доступ по email?**
- Да, но потребует добавить авторизацию (например через NextAuth.js). Текущее решение — через токен, это проще.

**Q: Данные защищены?**
- Транскрипты хранятся только в вашем Google Sheets (вы владелец)
- Gemini не сохраняет данные для обучения по умолчанию (проверьте настройки вашего аккаунта)
