const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
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

// OCR.space API OCRエンドポイント（無料: 500回/日）
app.post('/api/ocr', async (req, res) => {
  const { image } = req.body; // Base64エンコードされた画像

  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  if (!process.env.OCR_SPACE_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured',
      fallback: true // クライアント側でTesseract.jsにフォールバック
    });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('apikey', process.env.OCR_SPACE_API_KEY);
    formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    formData.append('language', 'jpn'); // 日本語
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Engine 2は数字認識が優秀
    formData.append('scale', 'true'); // 画像を拡大して認識精度向上

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error('OCR.space error:', data.ErrorMessage);
      return res.status(500).json({ error: data.ErrorMessage?.[0], fallback: true });
    }

    const text = data.ParsedResults?.[0]?.ParsedText || '';
    console.log('OCR.space recognized:', text.substring(0, 100));
    res.json({ success: true, text });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  // デバッグ: トークン設定確認
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log('✅ LINE_CHANNEL_ACCESS_TOKEN is configured');
  } else {
    console.log('❌ LINE_CHANNEL_ACCESS_TOKEN is NOT configured');
    console.log('   .envファイルを確認してください');
  }
  console.log('');
  console.log('【LINE連携の設定手順】');
  console.log('1. LINE Developers Consoleでチャネル作成');
  console.log('2. .envファイルにLINE_CHANNEL_ACCESS_TOKENを設定');
  console.log('3. Webhook URLを設定（ngrok等でトンネル必要）');
  console.log('4. 友だち追加後、コンソールに表示されるUser IDをコピー');
});
