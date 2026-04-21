#!/usr/bin/env python3
"""
既存 post_media テーブルの picsum URL を安定形式に一括更新するスクリプト。

  変更前: https://picsum.photos/1080/1080?random=N
  変更後: https://picsum.photos/id/N/1080/1080

使用方法:
  python3 scripts/fix_picsum_urls.py            # 実際に更新
  python3 scripts/fix_picsum_urls.py --dry-run  # 確認のみ（変更なし）

前提:
  - PostgreSQL が localhost:5432 で起動中であること
  - psycopg2 がインストール済みであること: pip install psycopg2-binary
"""
import re
import sys

DB_DSN = "postgresql://instagram:instagram_pass@localhost:5432/instagram_db"
OLD_PATTERN = re.compile(r"https://picsum\.photos/1080/1080\?random=(\d+)")
NEW_TPL = "https://picsum.photos/id/{}/1080/1080"


def fix_urls(dry_run: bool = False):
    try:
        import psycopg2
    except ImportError:
        print("✗ psycopg2 が必要です: pip install psycopg2-binary")
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT media_id, media_url FROM post_media "
                "WHERE media_url LIKE 'https://picsum.photos/1080/1080?random=%'"
            )
            rows = cur.fetchall()

        if not rows:
            print("対象レコードが見つかりません（すでに更新済みの可能性があります）")
            return

        print(f"対象レコード数: {len(rows)}")
