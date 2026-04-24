# 動画投稿機能 実装引き継ぎ書

> このドキュメントは AI エージェント（Codex 等）が続きから開発を再開できるよう作成しています。

## 実装完了内容（2026-04-25）

### 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `services/media-service/Dockerfile` | ffmpeg インストール追加 |
| `services/media-service/media_app/models.py` | `thumbnail_url` フィールド追加 |
| `services/media-service/media_app/migrations/0002_mediafile_thumbnail_url.py` | マイグレーション |
| `services/media-service/media_app/serializers.py` | 動画サイズ制限 200MB→100MB、`thumbnail_url` をシリアライザーに追加 |
| `services/media-service/media_app/views.py` | ffprobe で duration 取得・60秒超えバリデーション、ffmpeg でサムネイル生成 |
| `services/media-service/config/settings/base.py` | `DATA_UPLOAD_MAX_MEMORY_SIZE` 210MB→110MB |
| `services/post-service/posts/models.py` | `PostMedia` に `thumbnail_url` 追加 |
| `services/post-service/posts/migrations/0002_postmedia_thumbnail_url.py` | マイグレーション |
| `services/post-service/posts/serializers.py` | `thumbnail_url` をフィールドに追加、`media_type` 正規化 |
| `infra/docker/nginx/conf.d/api.conf` | `/media/` に Range Request・mp4 モジュール追加、`/api/v1/media/` タイムアウト 300s |
| `frontend/lib/types.ts` | `PostMedia.thumbnail_url` 追加 |
| `frontend/lib/api.ts` | `mediaApi.upload` に progress コールバック追加、timeout 3分 |
| `frontend/components/VideoPlayer.tsx` | **新規** HTML5 動画プレーヤー |
| `frontend/components/PostCard.tsx` | 動画投稿で `VideoPlayer` を表示 |
| `frontend/components/PostDetailModal.tsx` | 詳細モーダルでも `VideoPlayer` を表示 |
| `frontend/components/CreatePostModal.tsx` | 動画プレビュー・バリデーション・進捗バー |
| `frontend/app/(main)/profile/[username]/page.tsx` | `getPostThumbnail()` が動画サムネイルを優先 |

---

## アーキテクチャ概要

```
[Frontend Next.js :3001]
  ↓ POST /api/v1/media/upload/  (multipart, video file)
[Nginx :8888]
  ↓
[media-service :8004]  ← ffmpeg/ffprobe でサムネイル生成・duration 検証
  → /var/media/{user_id}/{media_id}.mp4   (動画)
  → /var/media/{user_id}/thumb_{media_id}.jpg  (サムネイル)
  ← { url, thumbnail_url, duration, ... }

[Frontend]
  ↓ POST /api/v1/posts/
[post-service :8002]
  → posts テーブル (media_type='video')
  → post_media テーブル (media_url, thumbnail_url, duration)
```

---

## 残タスク（未実装）

### 必須
- [ ] `docker-compose up --build` で動作確認（ffmpeg が Dockerfile に追加済み、ビルドが必要）
- [ ] `docker exec instagram_media_service python manage.py migrate` でマイグレーション実行
- [ ] `docker exec instagram_post_service python manage.py migrate` でマイグレーション実行

### 推奨改善
- [ ] **動画圧縮**: ffmpeg で H.264 + AAC に再エンコードしてファイルサイズを削減
  - `ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac output.mp4`
- [ ] **HLS ストリーミング**: ffmpeg で `.m3u8` に変換して低速回線対応
- [ ] **非同期処理**: Celery タスクでサムネイル生成・圧縮を非同期化（現在は同期処理）
- [ ] **AVI 対応**: media-service serializer の `ALLOWED_VIDEO_TYPES` に `video/avi` を追加
- [ ] **動画音量調整**: VideoPlayer に音量スライダーを追加
- [ ] **動画再生時間表示**: コントロールバーに `00:30 / 01:00` 形式で時間表示
- [ ] **自動再生**: フィードスクロール時に画面内の動画を自動再生（Intersection Observer 拡張）
- [ ] **Reels ページ**: 縦スクロール TikTok 風動画フィード（`/reels` ページ）
- [ ] **E2E テスト**: Playwright で動画アップロード → フィード表示のテスト追加

### フロントエンド改善
- [ ] `PostCard.tsx`: 動画の再生回数（view_count）表示
- [ ] カルーセル投稿での動画混在（現状は1枚目が動画の場合のみ対応）
- [ ] モバイル: 動画のタップで音量オン/オフ切り替え

---

## ローカル開発環境での動作確認手順

```bash
# 1. コンテナをリビルド（ffmpeg 追加のため必須）
docker-compose build media-service nginx
docker-compose up -d

# 2. マイグレーション実行
docker exec instagram_media_service python manage.py migrate
docker exec instagram_post_service python manage.py migrate

# 3. フロントエンド開発サーバー（ホットリロード）
# http://localhost:3001 でアクセス

# 4. 動画投稿テスト手順
# ① ログイン → 投稿作成ボタン（+）をクリック
# ② mp4/mov ファイルを選択（100MB以下・60秒以内）
# ③ プレビューでファイル情報（名前・サイズ・長さ）が表示されることを確認
# ④ 「次へ」→ キャプション入力 → 「シェア」
# ⑤ プログレスバーが表示されながらアップロード
# ⑥ フィードに動画投稿が表示され、クリックで再生できることを確認
# ⑦ プロフィールページで動画サムネイルに▶マークが表示されることを確認
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| サムネイルが生成されない | コンテナに ffmpeg が未インストール | `docker-compose build media-service` |
| 動画 duration が null | ffprobe が利用不可 | 上記と同じ（ffmpeg パッケージに ffprobe が含まれる） |
| アップロードが途中で失敗 | Nginx タイムアウト | 設定済み（300s）、ファイルサイズが 100MB 以下か確認 |
| 動画が再生されない | CORS / Range Request 未対応 | Nginx 設定に `Accept-Ranges bytes` 追加済み |
| `media_type` バリデーションエラー | `'image'` が post-service で無効 | serializer で `'image'→'photo'` 正規化済み |
