#!/bin/bash

# LINE通知Cron APIをテストするスクリプト
# 
# 使用方法:
#   # ローカルでテスト
#   ./scripts/test-cron.sh local
#
#   # 本番でテスト (CRON_SECRETが必要)
#   CRON_SECRET=your_secret ./scripts/test-cron.sh production

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    echo "ローカル環境でテスト中..."
    curl -s http://localhost:3000/api/cron/notify | jq .
elif [ "$ENV" = "production" ]; then
    if [ -z "$CRON_SECRET" ]; then
        echo "エラー: CRON_SECRET環境変数が設定されていません"
        echo "使用方法: CRON_SECRET=your_secret ./scripts/test-cron.sh production"
        exit 1
    fi
    
    # 本番URLを設定（適宜変更）
    PROD_URL="${VERCEL_URL:-https://your-project.vercel.app}"
    
    echo "本番環境 ($PROD_URL) でテスト中..."
    curl -s -H "Authorization: Bearer $CRON_SECRET" "$PROD_URL/api/cron/notify" | jq .
else
    echo "使用方法: ./scripts/test-cron.sh [local|production]"
    exit 1
fi
