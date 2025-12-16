# stockpile-manager

非常袋の備蓄品と賞味期限を管理するアプリ

## 機能

- 備蓄品の登録（品名・賞味期限）
- 一覧表示（期限順ソート）
- 削除機能
- **段階的通知**: 30日前・7日前・前日に通知
  - Web Notification API（ブラウザ通知）
  - LINE Messaging API（LINE通知）
- **OCR機能**: 写真から日付を読み取り、入力補助

## 通知仕様

- 通知タイミング: 30日前、7日前、前日の3段階
- 同一アイテムにつき、各タイミングで1回のみ通知
- 通知メッセージに品名と賞味期限を含む
- LINE通知は設定済みの場合のみ送信

## 使い方（ローカルサーバー版）

```bash
npm install
npm start
```

http://localhost:3000 でアプリを開く

## LINE連携手順

### 1. LINE Developers Console でチャネル作成
1. [LINE Developers Console](https://developers.line.biz/) にログイン
2. 新規プロバイダー作成 → Messaging API チャネル作成
3. チャネル基本設定から **Channel Access Token** を発行

### 2. 環境変数設定
```bash
cp .env.example .env
# .env ファイルを編集し、LINE_CHANNEL_ACCESS_TOKEN を設定
```

### 3. Webhook設定（友だち追加でUser ID取得）
1. ngrok等でローカルサーバーを公開: `ngrok http 3000`
2. LINE Developers Console で Webhook URL を設定: `https://xxxx.ngrok.io/api/line/webhook`
3. LINEアプリで友だち追加（QRコード）
4. サーバーコンソールに表示される **LINE User ID** をコピー

### 4. User ID をブラウザに登録
ブラウザの開発者コンソールで実行:
```javascript
setLineUserId('Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
```

以降、通知時にLINEにもメッセージが届きます。

## 使い方（静的ファイル版）

1. `index.html` をブラウザで開く
2. 「+ 備蓄品を追加」をクリック
3. 品名を入力
4. （任意）「写真を選択」で賞味期限ラベルの写真をアップロード → 日付が自動入力される
5. 賞味期限を確認・編集して「保存」

## OCR機能について

- Tesseract.js を使用（ブラウザ単独で動作）
- 対応形式: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`, `YYYY年MM月DD日`
- OCR結果は候補として表示され、ユーザーが確認・編集可能
- 初回実行時に言語データ（約2MB）をダウンロード
