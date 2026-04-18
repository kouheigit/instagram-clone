-- 拡張機能のみ。テーブルはDjangoマイグレーションで管理。
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- search-service: 部分一致検索用
