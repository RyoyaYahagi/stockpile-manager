# 📦 stockpile-manager

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

### 家族共有
- 👨‍👩‍👧‍👦 家族グループの作成
- 🔗 招待コードで家族メンバーを追加
- 👥 家族全員で備蓄品を共有管理

### LINE通知
- 📱 期限7日前にLINE通知
- 👨‍👩‍👧‍👦 LINEグループへの通知対応
- 🔔 毎日20時（日本時間）に自動チェック

## 🚀 技術スタック

- **フロントエンド**: Next.js 16 + React 19 + TypeScript
- **スタイリング**: Tailwind CSS
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

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=...

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

### 個人通知
1. LINE Developers Console でMessaging APIチャネルを作成
2. Channel Access Token を発行し環境変数に設定
3. アプリのLINE設定からUser ID（Uから始まる）を入力

### グループ通知（推奨）
1. LINE Developers Console で「ボットのグループチャット参加を許可」をON
2. Webhook URL設定: `https://your-app.vercel.app/api/line/webhook`
3. 公式アカウントをグループに招待
4. グループ内でメッセージ送信
5. Vercelログで`groupId: C...`を確認
6. アプリのLINE設定からグループIDを入力

## 📸 OCR機能

- OCR.space API を使用
- カメラ撮影またはライブラリから画像選択
- 対応形式: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`, `YYYY年MM月DD日` など

## 🗓️ 自動通知

Vercel Cron Jobsで毎日 UTC 11:00（日本時間 20:00）に実行:
- 期限7日以内のアイテムを検出
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
│   │   ├── line/      # LINE Webhook
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
