const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;

// LINE通知送信API
app.post('/api/line/notify', async (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    return res.status(500).json({ error: 'LINE token not configured' });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      const errorData = await response.json();
      console.error('LINE API error:', errorData);
      res.status(response.status).json({ success: false, error: errorData });
    }
  } catch (err) {
    console.error('LINE notification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// LINE Webhook（友だち追加時にuser_id取得）
app.post('/api/line/webhook', (req, res) => {
  const events = req.body.events || [];
  
  events.forEach(event => {
    if (event.type === 'follow') {
      // 友だち追加時にuser_idをログ出力
      console.log('=================================');
      console.log('LINE User ID:', event.source.userId);
      console.log('このIDをアプリに設定してください');
      console.log('=================================');
    }
  });
  
  // LINE Webhookは常に200を返す必要がある
  res.status(200).end();
});

// LINE User ID 設定用API
app.post('/api/line/set-user-id', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  // クライアント側でLocalStorageに保存するので、ここでは受け取るだけ
  res.json({ success: true, userId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('【LINE連携の設定手順】');
  console.log('1. LINE Developers Consoleでチャネル作成');
  console.log('2. .envファイルにLINE_CHANNEL_ACCESS_TOKENを設定');
  console.log('3. Webhook URLを設定（ngrok等でトンネル必要）');
  console.log('4. 友だち追加後、コンソールに表示されるUser IDをコピー');
});
