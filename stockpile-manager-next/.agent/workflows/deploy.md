---
description: コード変更後にコミット→プッシュ→PR作成→マージを一括実行
---

# デプロイワークフロー

タスク完了後、Antigravityが自動的にコミットを提案します。

## ステップ1: コミット（タスク完了時に自動提案）
// turbo
```bash
cd /Users/yappa/code/app/stockpile_manager/stockpile-manager-next && git add . && git commit -m "変更内容"
```

## ステップ2: プッシュ（ユーザーが手動で実行）
```bash
git push
```

## ステップ3: PR作成（自動マージなし、確認後に手動マージ）
// turbo
```bash
cd /Users/yappa/code/app/stockpile_manager/stockpile-manager-next && ./scripts/pr.sh
```

## ステップ4: マージ（ユーザーが確認後に実行）
```bash
gh pr merge --squash
```
