const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const archiver = require('archiver');

const app = express();
app.use(cors());
app.use(express.json());

// SQLite setup
const dbPath = '/home/node/.openclaw/workspace/crypto_analytics.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT, name TEXT, plan TEXT DEFAULT 'Free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT, type TEXT, entry REAL, tp REAL, sl REAL,
    reason TEXT, accuracy REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE, value TEXT
  );
`);

// Insert default plans
const plans = {
  Free: { name: 'Free', price: 'бесплатно', indicators: 3, aiAnalyses: 5, charts: true, pairs: 3, signals: 5, refreshRate: 30 },
  Pro: { name: 'Pro', price: '$29/мес', indicators: 'все', aiAnalyses: 50, charts: true, pairs: 10, signals: 50, refreshRate: 10, alerts: true, whyButton: true, whale: true },
  Premium: { name: 'Premium', price: '$99/мес', indicators: 'все', aiAnalyses: -1, charts: true, pairs: 10, signals: -1, refreshRate: 5, alerts: true, whale: true, ai: true, realtimeAI: true, prioritySupport: true }
};
const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(plans)) upsert.run(`plan_${k}`, JSON.stringify(v));

// API proxy routes
app.get('/api/klines', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 500 } = req.query;
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ticker24h', async (req, res) => {
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const data = await r.json();
    const pairs = ['BTCUSDT','ETHUSDT','BNBUSDT','XRPUSDT','ADAUSDT','SOLUSDT','DOGEUSDT','DOTUSDT','MATICUSDT','AVAXUSDT'];
    res.json(data.filter(t => pairs.includes(t.symbol)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fng', async (req, res) => {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1');
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/signals', (req, res) => {
  const signals = db.prepare('SELECT * FROM signals ORDER BY created_at DESC LIMIT 20').all();
  res.json(signals);
});

app.post('/api/signals', (req, res) => {
  const { pair, type, entry, tp, sl, reason, accuracy } = req.body;
  const r = db.prepare('INSERT INTO signals (pair,type,entry,tp,sl,reason,accuracy) VALUES (?,?,?,?,?,?,?)').run(pair, type, entry, tp, sl, reason, accuracy);
  res.json({ id: r.lastInsertRowid });
});

// Groq AI Analysis (Llama 3.1)
const GROQ_KEY = process.env.GROQ_API_KEY;
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { symbol, price, change24h, high, low, volume, fng, marketData } = req.body;
    const prompt = `Проанализируй криптовалюту ${symbol || 'BTCUSDT'}.

Текущие данные:
- Цена: $${price}
- Изменение за 24ч: ${change24h}%
- Максимум 24ч: $${high}
- Минимум 24ч: $${low}
- Объём: ${volume}
- Индекс страха и жадности: ${fng || 'N/A'}
${marketData ? `- Дополнительные данные рынка: ${JSON.stringify(marketData)}` : ''}

Дай подробный анализ по следующим пунктам:

## 📊 Технический анализ
Уровни поддержки и сопротивления, текущий тренд, паттерны на графике.

## 📈 Фундаментальный анализ
Общая ситуация на рынке, влияющие факторы.

## 🎯 Торговый сигнал
Укажи: LONG, SHORT или НЕЙТРАЛЬНО
- Точка входа
- Take Profit (TP)
- Stop Loss (SL)

## 💡 Объяснение
Почему именно этот сигнал? Подробное обоснование.

## 📊 Уверенность
Оценка уверенности в сигнале в процентах (0-100%).`;

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Ты — профессиональный крипто-аналитик. Отвечай подробно на русском языке. Используй markdown форматирование.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || (data?.error?.message ? `Ошибка API: ${data.error.message}` : 'Ошибка получения ответа от AI');
    res.json({ analysis: text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const messages = [
      { role: 'system', content: 'Ты — AI помощник на платформе KotvukAI. Отвечай на вопросы о криптовалютах, трейдинге, техническом и фундаментальном анализе. Будь полезным и дружелюбным. Отвечай на том языке, на котором задан вопрос.' },
      ...history.filter(m => m.role && m.content).slice(-10),
      { role: 'user', content: message }
    ];
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature: 0.7, max_tokens: 1500 })
    });
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || data?.error?.message || 'Ошибка';
    res.json({ reply });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download project as ZIP
app.get('/api/download-project', (req, res) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('KotvukAI.zip');
  archive.pipe(res);

  // Source files
  archive.directory(path.join(__dirname, 'src'), 'KotvukAI/src');
  archive.file(path.join(__dirname, 'server.js'), { name: 'KotvukAI/server.js' });
  archive.file(path.join(__dirname, 'package.json'), { name: 'KotvukAI/package.json' });
  archive.file(path.join(__dirname, 'vite.config.js'), { name: 'KotvukAI/vite.config.js' });
  if (require('fs').existsSync(path.join(__dirname, 'index.html'))) {
    archive.file(path.join(__dirname, 'index.html'), { name: 'KotvukAI/index.html' });
  }

  // README
  const readme = `# KotvukAI — Крипто Аналитика

## Установка и запуск

### Требования
- Node.js 18+

### Шаги
\`\`\`bash
# 1. Установить зависимости
npm install

# 2. Собрать фронтенд
npx vite build

# 3. Запустить сервер
node server.js

# 4. Открыть в браузере
# http://localhost:3000
\`\`\`

## Функции
- 📊 Графики криптовалют (реальные данные Binance)
- 🤖 AI Аналитика (Groq + Llama 3.1)
- 💬 AI Чат
- 📚 Обучение (8 уроков)
- 🌐 Мультиязычность (RU/EN)
- ⚙️ Настройки (язык, профиль, тарифы)

## Технологии
- React + Vite
- TradingView Lightweight Charts
- Express.js
- SQLite (better-sqlite3)
- Groq API (Llama 3.1)
`;
  archive.append(readme, { name: 'KotvukAI/README.md' });

  // .gitignore
  archive.append('node_modules/\ndist/\n*.db\n.env\n', { name: 'KotvukAI/.gitignore' });

  archive.finalize();
});

// Serve static
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(3000, () => console.log('KotvukAI running on port 3000'));
