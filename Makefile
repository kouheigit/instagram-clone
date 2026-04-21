.PHONY: up down build logs migrate shell ps frontend-dev seed fix-images

## Docker起動
up:
	docker compose up -d

## インフラのみ起動 (DB/Redis/Kafka)
up-infra:
	docker compose up -d postgres redis zookeeper kafka

## ビルド + 起動
build:
	docker compose up -d --build

## 停止
down:
	docker compose down

## 停止 + ボリューム削除
down-v:
	docker compose down -v

## ログ確認
logs:
	docker compose logs -f

## フロントエンド起動
frontend-dev:
	cd frontend && npm run dev

## 各サービスのマイグレーション実行
migrate:
	docker compose exec user-service python manage.py migrate
	docker compose exec post-service python manage.py migrate
	docker compose exec feed-service python manage.py migrate
	docker compose exec story-service python manage.py migrate
	docker compose exec notification-service python manage.py migrate
	docker compose exec media-service python manage.py migrate
	docker compose exec search-service python manage.py migrate
	docker compose exec dm-service python manage.py migrate

## コンテナ一覧
ps:
	docker compose ps

## user-serviceのシェル
shell-user:
	docker compose exec user-service python manage.py shell

## post-serviceのシェル
shell-post:
	docker compose exec post-service python manage.py shell

## テストユーザー作成
create-superuser:
	docker compose exec user-service python manage.py createsuperuser

## シードデータ投入
seed:
	python3 scripts/seed.py

## 既存DBの picsum URL を安定形式に一括更新
fix-images:
	python3 scripts/fix_picsum_urls.py

## ヘルスチェック
health:
	@echo "=== user-service ===" && curl -s http://localhost:8001/health | python3 -m json.tool
	@echo "=== post-service ===" && curl -s http://localhost:8002/health | python3 -m json.tool
	@echo "=== feed-service ===" && curl -s http://localhost:8003/health | python3 -m json.tool
	@echo "=== media-service ===" && curl -s http://localhost:8004/health | python3 -m json.tool
	@echo "=== story-service ===" && curl -s http://localhost:8005/health | python3 -m json.tool
	@echo "=== search-service ===" && curl -s http://localhost:8006/health | python3 -m json.tool
	@echo "=== dm-service ===" && curl -s http://localhost:8007/health | python3 -m json.tool
	@echo "=== notification-service ===" && curl -s http://localhost:8008/health | python3 -m json.tool
