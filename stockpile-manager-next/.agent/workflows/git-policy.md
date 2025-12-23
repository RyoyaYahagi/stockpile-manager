---
description: リポジトリ運用エージェント - git操作・CI・PR作成ポリシー
---

# リポジトリ運用ポリシー

このワークフローは、git操作・CI実行・PR作成を自動化し、**PRのレビューとmainへのマージは必ず人が行う**ポリシーに従います。

---

## リポジトリ情報
- リポジトリURL: https://github.com/RyoyaYahagi/stockpile-manager
- デフォルトベースブランチ: develop
- テストコマンド: `npm run build`
- Lintコマンド: `npm run lint`（未設定の場合はスキップ）

---

## 開発フロー（概要）

### 1. Issue作成（人間）
- 要件/タスクを人間がIssueとして作成

### 2. ブランチ作成（自動）
- 命名規則: `<type>/<ISSUE番号>-short-desc`
- type: `feature` | `fix` | `chore` | `hotfix` | `refactor`
- 例: `feature/ISSUE-123-add-login`, `fix/ISSUE-456-api-error`
- エージェントがベースブランチ（develop）を確認して作成

### 3. 実装・小刻みコミット（自動）
- エージェントが作業単位でコミット（Conventional Commits準拠）
- コミット例: `feat(auth): add OAuth login (#123)`
- **設計変更・重大リファクタは事前に人へ通知**

### 4. ローカルテスト・CI実行（自動）
- `npm run build` 等、指定テストコマンドを実行
- **CIがパスするまでマージ不可**

### 5. push & PR作成（自動、マージは保留）
- main/master以外のブランチへpush（自動）
- PR本文はテンプレートに従って自動生成（`./scripts/pr.sh`）
- **PRを作るまでは自動、マージは人間の確認後のみ**

### 6. レビュー（人間）
- レビュワーがapproveしたら、人間がマージ

### 7. リリース（人間 or 自動化ルール）
- mainへのマージ後にタグ付け・リリース

---

## 命名規約

### ブランチ名
```
<type>/<ISSUE番号>-short-desc
```
- type: `feature` | `fix` | `chore` | `hotfix` | `refactor`

### コミットメッセージ（Conventional Commits）
```
<type>(<scope>): <description> (#ISSUE)
```
- 例: `feat(auth): add OAuth login (#123)`
- 例: `fix(api): correct 500 on /users (#456)`

---

## 自動化ルール

### 自動実行OK（AIが実行）
1. ブランチの作成・命名
2. 小さな変更のコミット（Conventional Commits準拠）
3. `git push origin <branch>`（main/master以外）
4. テスト実行、静的解析（linters）の実行
5. PRの作成（`./scripts/pr.sh` 使用、マージはしない）
6. PR説明文・変更点の要約生成
7. 軽微なconflict解消（事前ポリシーで許可した場合のみ、解消案をPRに記載）
8. CIログの取得と要約
9. 自動実行ログをPRに添付

### 必ず人が行う（自動化しない）
- **PRの最終レビュー & 承認**
- **main/masterへのマージ**（自動マージは不可）
- 設計やAPIなどの重大な方針変更の判断
- セキュリティ影響の高い変更の承認

---

## 実務ルール（AIが守る）

1. **絶対に直接 main/master に push しない**。すべて feature/* へ。
2. **PRはCIがgreenにならない限りレビュー依頼しない**（作成はOK、レビュー依頼はCI pass後）
3. コミットメッセージは **Conventional Commits準拠**
4. 1コミットの最大行数変更は **300行まで**（大きい変更は分割提案）
5. PR作成時に **自動でチェックリストを入れる**
6. 必要なテストがある場合は **必ず追加**
7. **自動実行ログ**を常にPRに添付（コマンド + 出力の要約）
8. コミットには `--signoff` を付ける

---

## PR作成時のチェック基準

- [ ] テスト/ビルドコマンドが exit 0
- [ ] Lintが exit 0（設定されている場合）
- [ ] 変更が1つの目的にまとまっている
- [ ] 大きすぎる変更は分割案を提示
- [ ] セキュリティ影響がないか確認

---

## PRテンプレート（`./scripts/pr.sh` が自動生成）

```markdown
## 概要
[変更の1行サマリ]

## 変更内容
- コミット1
- コミット2

## 差分ハイライト
[変更ファイル統計]

## 自動実行ログ
- 実行コマンド一覧
- テスト/ビルド結果

## 動作確認手順
- [ ] ローカルで動作確認済み
- [ ] 本番環境で確認済み

## チェックリスト
- [ ] テスト/ビルドが通っている
- [ ] 変更が1つの目的にまとまっている
- [ ] セキュリティに影響する変更はない
- [ ] 必要なテストを追加した
```

---

## エラー発生時の動作

- **テスト/CIが失敗した場合**: マージ要求は行わず、失敗ログと再現手順を記載した報告を作成
- **競合が解消できない場合**: 変更のスナップショットと解決提案を人に提示して停止
- **重大な判断が必要な場合**: 必ず人に確認を求めて停止

---

## 出力フォーマット（人に提示する要約）

```
## 1行サマリ
[何をしたか]（例: Created branch feature/ISSUE-123-add-login and pushed 3 commits）

## 実行コマンド一覧
- git add .
- git commit -m "..."
- git push origin develop

## テスト/ビルド結果
- npm run build: ✅ 成功 / ❌ 失敗

## PRリンク
https://github.com/RyoyaYahagi/stockpile-manager/pull/XX

## 次の推奨アクション
- [ ] PRの内容を確認
- [ ] `gh pr merge --squash` でマージ
```
