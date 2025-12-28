# 📦 stockpile-manager

[https://stockpile-manager.vercel.app/](https://stockpile-manager.vercel.app/)

非常袋の備蓄品と賞味期限を管理するWebアプリ

## ✨ 機能

### 備蓄品管理
- 📝 備蓄品の登録・編集・削除
- 📷 写真から賞味期限を読み取り（OCR）
- 📊 期限順ソートで一覧表示
- ⚠️ 期限切れ・期限間近の視覚的警告

### 袋・場所管理
- 🎒 複数の非常袋を管理（例: 玄関用、車載用）
- 📍 場所メモで収納場所を記録
- 🗑️ 袋の削除機能

### ユーザー・家族共有
- 👤 ゲストログイン機能（登録なしでお試し利用）
- 👨‍👩‍👧‍👦 家族グループの作成
- 🔗 招待コードで家族メンバーを追加
- 👥 家族全員で備蓄品を共有管理

### LINE通知
- 📱 期限30日前、7日前、当日にLINE通知
- 🔗 QRコードで簡単連携（6桁コードで紐付け）
- 👨‍👩‍👧‍👦 LINEグループへの通知対応
- 🔔 毎日午前8時（日本時間）に自動チェック

## 🚀 技術スタック

- **フロントエンド**: Next.js 16.1 + React 19.2 + TypeScript
- **スタイリング**: Tailwind CSS 4
- **認証**: Stack Auth
- **データベース**: Neon (PostgreSQL) + Drizzle ORM
- **OCR**: OCR.space API
- **通知**: LINE Messaging API
- **デプロイ**: Vercel

## 🛠️ セットアップ

### 1. 依存関係インストール
```bash
cd stockpile-manager-next
npm install
```

### 2. 環境変数設定
```bash
cp .env.example .env.local
```

`.env.local` を編集:
```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...

# OCR.space API
OCR_SPACE_API_KEY=...

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
NEXT_PUBLIC_LINE_BOT_ID=@xxx

# Vercel Cron
CRON_SECRET=...  # openssl rand -hex 32 で生成
```

### 3. データベースマイグレーション
```bash
npx drizzle-kit push
```

### 4. 開発サーバー起動
```bash
npm run dev
```

http://localhost:3000 でアプリを開く

## 📱 LINE連携設定

### 簡単連携（QRコード）
1. アプリのダッシュボードで「LINE連携設定」をクリック
2. 「連携コードを発行」ボタンをクリック
3. 表示されたQRコードをスキャンしてLINEボットを友だち追加
4. LINEに表示された6桁のコードをボットに送信
5. 自動的に連携完了！

### 環境変数設定
LINE Developers ConsoleでMessaging APIチャネルを作成し、以下を設定:
```env
LINE_CHANNEL_ACCESS_TOKEN=...  # Channel Access Token
LINE_CHANNEL_SECRET=...         # Channel Secret
NEXT_PUBLIC_LINE_BOT_ID=@xxx   # LINE Bot ID（QRコード用）
```

### Webhook URL設定
LINE Developers Console → Messaging API → Webhook設定:
```
https://your-app.vercel.app/api/webhook/line
```

### グループ通知（推奨）
1. LINE Developers Console で「ボットのグループチャット参加を許可」をON
2. 公式アカウントをグループに招待
3. グループ内でメッセージ送信
4. Vercelログで`groupId: C...`を確認
5. アプリのLINE設定（詳細設定）からグループIDを手動入力

## 📸 OCR機能

- OCR.space API を使用
- カメラ撮影またはライブラリから画像選択
- 対応形式: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`, `YYYY年MM月DD日` など

## 🗓️ 自動通知

Vercel Cron Jobsで毎日 UTC 23:00（日本時間 08:00）に実行:
- 期限30日以内、7日以内、または当日のアイテムを検出
- 家族にLINEグループIDがあればグループに通知
- なければ個人のLINE User IDに通知

## 📂 プロジェクト構成

```
stockpile-manager-next/
├── app/
│   ├── api/           # APIエンドポイント
│   │   ├── bags/      # 袋CRUD
│   │   ├── cron/      # 通知Cron
│   │   ├── family/    # 家族管理
│   │   ├── items/     # 備蓄品CRUD
│   │   ├── line/      # LINE Webhook・リンク
│   │   ├── ocr/       # OCR処理
│   │   └── user/      # ユーザー設定
│   ├── dashboard/     # ダッシュボード
│   ├── family/        # 家族セットアップ
│   └── login/         # ログイン
├── components/        # UIコンポーネント
├── lib/
│   ├── auth/          # Stack Auth設定
│   └── db/            # Drizzle スキーマ
└── drizzle/           # マイグレーション
```

## 📝 ライセンス

MIT
