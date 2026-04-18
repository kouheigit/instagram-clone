-- Instagram Cassandra 初期スキーマ
-- 詳細設計書 4.2.2 主要テーブル定義 に基づく

CREATE KEYSPACE IF NOT EXISTS instagram
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
} AND durable_writes = true;

USE instagram;

-- ===========================
-- DMメッセージテーブル (4.2.2)
-- ===========================
CREATE TABLE IF NOT EXISTS messages (
    conversation_id UUID,
    message_id      TIMEUUID,
    sender_id       UUID,
    content         TEXT,
    media_url       TEXT,
    is_read         BOOLEAN,
    is_delivered    BOOLEAN,
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND default_time_to_live = 0
  AND comment = 'DMメッセージ。パーティションキー: conversation_id';

-- ===========================
-- フィードタイムラインテーブル (4.2.2)
-- Push/Pullハイブリッド方式 (3.5.1)
-- ===========================
CREATE TABLE IF NOT EXISTS feed_timeline (
    user_id     UUID,
    score       FLOAT,
    post_id     UUID,
    author_id   UUID,
    created_at  TIMESTAMP,
    PRIMARY KEY (user_id, score, post_id)
) WITH CLUSTERING ORDER BY (score DESC, post_id ASC)
  AND default_time_to_live = 604800  -- 7日間TTL (4.3 Redis設計より)
  AND comment = 'ユーザーフィードタイムライン。TTL: 7日';

-- ===========================
-- 通知履歴テーブル
-- ===========================
CREATE TABLE IF NOT EXISTS notification_log (
    user_id         UUID,
    notification_id TIMEUUID,
    type            TEXT,
    actor_id        UUID,
    ref_id          UUID,
    is_read         BOOLEAN,
    created_at      TIMESTAMP,
    PRIMARY KEY (user_id, notification_id)
) WITH CLUSTERING ORDER BY (notification_id DESC)
  AND default_time_to_live = 7776000  -- 90日間TTL (4.3 Redis設計より)
  AND comment = '通知履歴。TTL: 90日';

-- ===========================
-- ストーリーズ閲覧履歴テーブル
-- ===========================
CREATE TABLE IF NOT EXISTS story_views (
    story_id    UUID,
    viewer_id   UUID,
    viewed_at   TIMESTAMP,
    PRIMARY KEY (story_id, viewer_id)
) WITH default_time_to_live = 86400  -- 24時間TTL (POST-04)
  AND comment 'ストーリーズ閲覧記録。TTL: 24時間';

-- ===========================
-- ユーザーアクティビティログ
-- ===========================
CREATE TABLE IF NOT EXISTS user_activity (
    user_id     UUID,
    event_time  TIMEUUID,
    event_type  TEXT,
    ref_id      UUID,
    metadata    TEXT,
    PRIMARY KEY (user_id, event_time)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND default_time_to_live = 7776000  -- 90日間TTL
  AND comment = 'ユーザー行動ログ。レコメンド学習用';
