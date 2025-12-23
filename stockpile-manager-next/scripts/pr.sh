#!/bin/bash

# PR作成スクリプト（マージなし版）
# 使い方: ./scripts/pr.sh [オプション]
# オプション:
#   -m, --merge    PRを作成後に自動マージ（非推奨）
#   -d, --draft    ドラフトPRとして作成

set -e

# 引数の解析
AUTO_MERGE=false
DRAFT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--merge) AUTO_MERGE=true; shift ;;
        -d|--draft) DRAFT=true; shift ;;
        *) shift ;;
    esac
done

# 現在のブランチを取得
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "Error: main/masterブランチからはPRを作成できません"
    exit 1
fi

# ベースブランチを決定
# - developブランチ → mainへPR
# - それ以外（feature/*等） → developへPR
if [ "$BRANCH" = "develop" ]; then
    BASE_BRANCH="main"
else
    BASE_BRANCH="develop"
fi

echo "Base branch: $BASE_BRANCH"

# コミットメッセージからPR情報を生成
COMMITS=$(git log origin/$BASE_BRANCH..$BRANCH --pretty=format:"- %s" --reverse 2>/dev/null || git log -10 --pretty=format:"- %s" --reverse)
FIRST_COMMIT=$(git log origin/$BASE_BRANCH..$BRANCH --pretty=format:"%s" --reverse 2>/dev/null | head -1 || git log -1 --pretty=format:"%s")

# コミットプレフィックスからラベルを決定
LABELS=""
if echo "$FIRST_COMMIT" | grep -q "^feat"; then
    LABELS="enhancement"
elif echo "$FIRST_COMMIT" | grep -q "^fix"; then
    LABELS="bug"
elif echo "$FIRST_COMMIT" | grep -q "^docs"; then
    LABELS="documentation"
elif echo "$FIRST_COMMIT" | grep -q "^refactor"; then
    LABELS="refactor"
elif echo "$FIRST_COMMIT" | grep -q "^test"; then
    LABELS="test"
elif echo "$FIRST_COMMIT" | grep -q "^chore"; then
    LABELS="chore"
elif echo "$FIRST_COMMIT" | grep -q "^hotfix"; then
    LABELS="bug,urgent"
fi

# 差分統計を取得
DIFF_STAT=$(git diff origin/$BASE_BRANCH --stat 2>/dev/null | tail -1 || echo "変更統計取得不可")

# PR本文を生成（テンプレート準拠）
BODY="## 概要
$FIRST_COMMIT

## 変更内容
$COMMITS

## 差分ハイライト
\`\`\`
$DIFF_STAT
\`\`\`

## 動作確認手順
- [ ] ローカルで動作確認済み
- [ ] 本番環境で確認済み

## チェックリスト
- [ ] テスト/ビルドが通っている
- [ ] 変更が1つの目的にまとまっている
- [ ] セキュリティに影響する変更はない
"

# PRタイトル（最初のコミットメッセージ）
TITLE="$FIRST_COMMIT"

# PRを作成
echo "Creating PR: $TITLE"
echo "---"
echo "Labels: $LABELS"
echo "---"

PR_ARGS=(--title "$TITLE" --body "$BODY")

if [ -n "$LABELS" ]; then
    PR_ARGS+=(--label "$LABELS")
fi

if [ "$DRAFT" = true ]; then
    PR_ARGS+=(--draft)
fi

# ベースブランチを指定
PR_ARGS+=(--base "$BASE_BRANCH")

gh pr create "${PR_ARGS[@]}"

# 自動マージ（オプション指定時のみ）
if [ "$AUTO_MERGE" = true ]; then
    echo ""
    echo "⚠️  警告: 自動マージが有効です。ポリシーではPR確認後のマージを推奨しています。"
    echo "Auto-merging..."
    gh pr merge --squash --auto
fi

echo ""
echo "Done!"
echo ""
echo "📋 次の推奨アクション:"
echo "  1. PRの内容を確認: gh pr view --web"
echo "  2. マージ: gh pr merge --squash"
