# Cursor引き継ぎ指示書

## プロジェクト概要

- **プロジェクト名:** Instagram Clone（学習・ポートフォリオ用）
- **技術スタック:**
  - バックエンド: Django REST Framework（マイクロサービス構成）
  - フロントエンド: Next.js 15 + TypeScript + Tailwind CSS v4
  - インフラ: Docker Compose、PostgreSQL、Redis、Kafka、nginx、Prometheus、Grafana
- **目的:** 本番同等のマイクロサービスアーキテクチャを学習しながらポートフォリオとして構築

---

## 現在の実装状況

### バックエンド（全サービス完成 ✅）

| サービス | ポート | 状態 |
|---|---|---|
| user-service | 8001 | ✅ 完成 |
| post-service | 8002 | ✅ 完成 |
| feed-service | 8003 | ✅ 完成 |
| media-service | 8004 | ✅ 完成 |
| story-service | 8005 | ✅ 完成 |
| search-service | 8006 | ✅ 完成 |
| dm-service | 8007 | ✅ 完成 |
| notification-service | 8008 | ✅ 完成 |
| nginx API gateway | 8888 | ✅ 稼働中 |

#### 実装済みAPI（主要）
- user-service: プロフィール取得・フォロー/アンフォロー・フォロワー/フォロー中一覧・ログイン・登録・パスワード変更・フォローリクエスト承認/拒否
- post-service: 投稿CRUD・いいね・コメント・コメント削除・コメントいいね・保存・いいねユーザー一覧
- feed-service: ホームフィード（無限スクロール）・Explore
- story-service: ストーリー投稿・一覧・閲覧者一覧
- dm-service: 会話開始・メッセージ送受信・既読
- notification-service: 通知一覧・未読数・既読化・個別削除・内部API（いいね/コメント/フォロー通知自動送信）
- search-service: ユーザー/ハッシュタグ検索

#### インフラ・DB
- PostgreSQL: `instagram_db`（user: instagram / pass: instagram_pass）
- Redis: port 6380（他PJが6379を使用するため変更済み）、pass: redis_pass
- シードデータ: ユーザー10人・投稿100件・フォロー35件・フィードアイテム1974件・ハッシュタグ13件

### フロントエンド（実装済みページ）
ディレクトリ: `/Users/user/Desktop/pgfile/instagram/frontend/`
起動コマンド: `npm run dev`
アクセス: `http://localhost:3001`
補足: `localhost:3000` は Grafana が使用
APIベース: `http://localhost:8888/api/v1`（nginx経由）

| ページ | パス | 状態 |
|---|---|---|
| ログイン | `/login` | ✅ |
| 登録 | `/register` | ✅ |
| ホームフィード | `/` | ✅ StoryBar + PostCard + 無限スクロール |
| Explore | `/explore` | ✅ 検索 + グリッド |
| ハッシュタグ | `/hashtag/[tag]` | ✅ |
| 投稿詳細 | `/posts/[id]` | ✅ コメント・いいね |
| プロフィール | `/profile/[username]` | ✅ フォロワー/フォロー中モーダル |
| プロフィール編集 | `/profile/edit` | ✅ アバターアップロード・パスワード変更 |
| 通知 | `/notifications` | ✅ 個別削除・フォローリクエスト承認/拒否 |
| DM | `/dm` | ✅ 5秒ポーリング・新規会話開始 |

#### 主なコンポーネント（`/frontend/components/`）
- `Sidebar.tsx` — デスクトップ左サイドバー
- `BottomNav.tsx` — モバイル下部ナビ
- `StoryBar.tsx` — ストーリーバー（作成・閲覧・5秒自動進行・左右タップ移動）
- `PostCard.tsx` — 投稿カード（いいね・保存・コメント・ハッシュタグリンク・ダブルタップいいね）
- `CreatePostModal.tsx` — 投稿作成モーダル（ファイルアップロード対応）
- `RightSidebar.tsx` — フォロー提案
- `Avatar.tsx` — アバター

#### ライブラリ（`/frontend/lib/`）
- `api.ts` — Axiosベースの全APIクライアント
- `auth.tsx` — 認証Context + Provider
- `types.ts` — 全TypeScript型定義

---

## 未実装・残タスク（優先順位順）

1. ✅ **コメントリプライ機能** — `/posts/[id]` ページのコメントに返信（スレッド表示）を追加する。post-serviceのAPIは既存コメントCRUDを流用可能か確認し、必要なら内部APIを追加。
2. ✅ **ストーリー実ファイルアップロード** — 現状はモックURL（picsum.photos）を使用。media-serviceを経由してローカル `/media` ディレクトリに保存し、実ファイルを表示する。
3. ✅ **Kafkaイベント連携の確認** — Kafka起動時にフィードプッシュが動くか確認。現状はHTTP直接送信で通知を送っており、Kafka経由のフローが未検証。
4. ✅ **投稿詳細ページの改善** — 複数画像スワイプ対応（現状は1枚目のみ表示）。
5. ✅ **RightSidebar フォロー提案の動的化** — 現状は静的データの可能性あり。user-serviceの推薦APIと接続。
6. ✅ **パフォーマンス最適化** — 画像のlazy load、APIレスポンスのキャッシュ（SWR/React Query導入検討）。
7. ✅ **エラーハンドリング統一** — API失敗時のトースト通知をアプリ全体で統一。

---

## 直前まで作業していた内容

- フロントエンド全ページの実装を完了し、バックエンドAPIとの疎通確認済み。
- 最後に確認・修正したのは:
  - `usersApi.unfollow` が `api.post` → `api.delete` のバグ修正
  - media-service の `get_user_id` フォールバック追加
  - docker-compose の Redis ポート変更（6379 → 6380）

---

## 環境・起動方法

```bash
# プロジェクトルート: /Users/user/Desktop/pgfile/instagram/

# バックエンド（Docker）
docker compose up -d

# フロントエンド
cd frontend
npm run dev
```

- フロントエンド: http://localhost:3001
- バックエンドAPI: http://localhost:8888/api/v1
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

---

## Cursorへの指示

以下をそのままCursorに貼り付けて続きを実装してください：

「CURSOR_HANDOFF.mdを読んで、残タスクを上から順番に全て実装してください。実装方針は既存コードのスタイルに合わせること。完了したらCURSOR_HANDOFF.mdの該当タスクにチェックをつけてください。」

---

## 注意事項

- **Next.js 15は破壊的変更あり** — `frontend/AGENTS.md` に記載の通り、`node_modules/next/dist/docs/` を必ず参照すること
- **既存コードのスタイルを維持すること** — `lib/api.ts` のAPIクライアントパターン、`lib/types.ts` の型定義を活用
- **S3なし** — メディアファイルはローカル `/media` ディレクトリに保存（media-service経由）
- **Kafka不使用（開発環境）** — 通知はHTTP直接送信（urllib.request使用、requestsライブラリ未インストール）
- **WebSocketなし** — DMは5秒ポーリングで代替
- **環境変数** — 各サービスの `.env.example` を参照すること
- **Redis port** — 6380（6379は他プロジェクトが使用中）
- **コメントいいね** — CommentLikeテーブルなし、Redisキャッシュで二重いいね防止
