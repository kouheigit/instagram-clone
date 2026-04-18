"""
Celery タスク: 投稿作成後にフォロワーのフィードへプッシュ
詳細設計書 3.3.1 Step4 - Push/Pull ハイブリッド方式
"""
import logging
import urllib.request
import json

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def push_post_to_feed(self, post_id: str, author_id: str, score: float = 1.0):
    """
    投稿作成後にフォロワーの全員のフィードへプッシュする。
    user-service でフォロワーIDを取得し、feed-service の push_to_feed API を呼ぶ。
    """
    user_service_url = getattr(settings, "USER_SERVICE_URL", "http://user-service:8001")
    feed_service_url = getattr(settings, "FEED_SERVICE_URL", "http://feed-service:8003")

    try:
        # user-service からフォロワーID一覧を取得
        url = f"{user_service_url}/api/v1/users/internal/follower-ids/{author_id}/"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        follower_ids: list = data.get("follower_ids", [])

        if not follower_ids:
            logger.info(f"post {post_id}: no followers to push")
            return {"pushed": 0}

        # feed-service にプッシュ
        payload = {
            "post_id": post_id,
            "author_id": author_id,
            "follower_ids": follower_ids,
            "score": score,
        }
        feed_req = urllib.request.Request(
            f"{feed_service_url}/api/v1/feed/push/",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(feed_req, timeout=5) as feed_resp:
            result = json.loads(feed_resp.read())

        logger.info(f"post {post_id}: pushed to {result.get('pushed', 0)} feeds")
        return result

    except Exception as exc:
        logger.warning(f"push_post_to_feed failed for post {post_id}: {exc}")
        raise self.retry(exc=exc)
