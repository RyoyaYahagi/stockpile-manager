#!/bin/bash

# PRを自動で作成してマージするスクリプト
# 使い方: ./scripts/pr.sh [オプション]
# オプション:
#   -m, --merge    PRを作成後に自動マージ
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

if [ "$BRANCH" = "main" ]; then
    echo "Error: mainブランチからはPRを作成できません"
    exit 1
fi

# コミットメッセージからPR情報を生成
COMMITS=$(git log main..$BRANCH --pretty=format:"- %s" --reverse 2>/dev/null || git log -5 --pretty=format:"- %s" --reverse)
FIRST_COMMIT=$(git log main..$BRANCH --pretty=format:"%s" --reverse 2>/dev/null | head -1 || git log -1 --pretty=format:"%s")

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
fi

# PR本文を生成
BODY="## 変更内容

$COMMITS

## テスト方法
- [ ] ローカルで動作確認済み
- [ ] 本番環境で確認済み
"

# PRタイトル（最初のコミットメッセージ）
TITLE="$FIRST_COMMIT"

# PRを作成
echo "Creating PR: $TITLE"

PR_ARGS=(--title "$TITLE" --body "$BODY")

if [ -n "$LABELS" ]; then
    PR_ARGS+=(--label "$LABELS")
fi

if [ "$DRAFT" = true ]; then
    PR_ARGS+=(--draft)
fi

gh pr create "${PR_ARGS[@]}"

# 自動マージ
if [ "$AUTO_MERGE" = true ]; then
    echo "Auto-merging..."
    gh pr merge --squash --auto
fi

echo "Done!"
