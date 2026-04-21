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
