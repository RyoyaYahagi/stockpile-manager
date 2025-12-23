---
description: コード変更後にコミット→プッシュ→PR作成→マージを一括実行
---

# デプロイワークフロー

## ステップ1: コミット（Antigravity が自動実行）
// turbo
```bash
cd /Users/yappa/code/app/stockpile_manager/stockpile-manager-next && git add . && git commit -m "変更内容"
```

## ステップ2: プッシュ（ユーザーが手動で実行）
```bash
git push
```

## ステップ3: PR作成→マージ（Antigravity が自動実行）
// turbo
```bash
cd /Users/yappa/code/app/stockpile_manager/stockpile-manager-next && ./scripts/pr.sh -m
```
