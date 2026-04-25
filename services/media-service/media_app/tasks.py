import json
import logging
import os
import shutil
import subprocess

from celery import shared_task
from django.conf import settings

from .models import MediaFile

logger = logging.getLogger(__name__)

MAX_VIDEO_DURATION = 60
VIDEO_TRANSCODE_TIMEOUT = 180
HLS_TRANSCODE_TIMEOUT = 180


def extract_video_duration(file_path: str) -> float | None:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", file_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning(f"ffprobe failed: {result.stderr[:200]}")
            return None
        info = json.loads(result.stdout)
        return float(info.get("format", {}).get("duration", 0))
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError, ValueError) as exc:
        logger.warning(f"ffprobe unavailable or failed: {exc}")
        return None


def generate_thumbnail(file_path: str, user_id: str, media_id: str) -> str:
    thumb_dir = os.path.dirname(file_path)
    thumb_filename = f"thumb_{media_id}.jpg"
    thumb_path = os.path.join(thumb_dir, thumb_filename)
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", file_path, "-vframes", "1", "-q:v", "2", thumb_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and os.path.exists(thumb_path):
            return f"/media/{user_id}/{thumb_filename}"
        logger.warning(f"ffmpeg thumbnail failed: {result.stderr[:200]}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        logger.warning(f"ffmpeg unavailable or failed: {exc}")
    return ""


def transcode_video(file_path: str, user_id: str, media_id: str) -> tuple[str, str]:
    output_dir = os.path.dirname(file_path)
    output_filename = f"video_{media_id}.mp4"
    output_path = os.path.join(output_dir, output_filename)
    if os.path.abspath(output_path) == os.path.abspath(file_path):
        return file_path, f"/media/{user_id}/{output_filename}"

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", file_path,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ],
            capture_output=True,
            text=True,
            timeout=VIDEO_TRANSCODE_TIMEOUT,
        )
        if result.returncode == 0 and os.path.exists(output_path):
            return output_path, f"/media/{user_id}/{output_filename}"
        logger.warning(f"ffmpeg transcode failed: {result.stderr[:200]}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        logger.warning(f"ffmpeg transcode unavailable or failed: {exc}")

    return file_path, f"/media/{os.path.relpath(file_path, settings.MEDIA_ROOT)}"


def generate_hls(file_path: str, user_id: str, media_id: str) -> str:
    hls_dirname = f"hls_{media_id}"
    hls_dir = os.path.join(settings.MEDIA_ROOT, str(user_id), hls_dirname)
    playlist_path = os.path.join(hls_dir, "index.m3u8")
    segment_pattern = os.path.join(hls_dir, "segment_%03d.ts")
    os.makedirs(hls_dir, exist_ok=True)

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", file_path,
                "-codec", "copy",
                "-start_number", "0",
                "-hls_time", "6",
                "-hls_playlist_type", "vod",
                "-hls_segment_filename", segment_pattern,
                playlist_path,
            ],
            capture_output=True,
            text=True,
            timeout=HLS_TRANSCODE_TIMEOUT,
        )
        if result.returncode == 0 and os.path.exists(playlist_path):
            return f"/media/{user_id}/{hls_dirname}/index.m3u8"
        logger.warning(f"ffmpeg hls failed: {result.stderr[:200]}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        logger.warning(f"ffmpeg hls unavailable or failed: {exc}")
    return ""


def delete_related_video_files(media: MediaFile) -> None:
    if media.file and os.path.exists(media.file.path):
        try:
            os.remove(media.file.path)
        except OSError as exc:
            logger.warning(f"File delete failed: {exc}")

    if media.url:
        media_path = os.path.join(settings.MEDIA_ROOT, media.url.lstrip("/media/"))
        if os.path.exists(media_path) and media.file and os.path.abspath(media_path) != os.path.abspath(media.file.path):
            try:
                os.remove(media_path)
            except OSError as exc:
                logger.warning(f"Transcoded file delete failed: {exc}")

    if media.thumbnail_url:
        thumb_path = os.path.join(settings.MEDIA_ROOT, media.thumbnail_url.lstrip("/media/"))
        if os.path.exists(thumb_path):
            try:
                os.remove(thumb_path)
            except OSError:
                pass

    if media.hls_url:
        hls_path = os.path.join(settings.MEDIA_ROOT, media.hls_url.lstrip("/media/"))
        hls_dir = os.path.dirname(hls_path)
        if os.path.isdir(hls_dir):
            shutil.rmtree(hls_dir, ignore_errors=True)


@shared_task(bind=True, max_retries=2, default_retry_delay=10)
def process_video_media(self, media_id: str):
    try:
        media = MediaFile.objects.get(media_id=media_id, media_type=MediaFile.TYPE_VIDEO)
    except MediaFile.DoesNotExist:
        logger.warning(f"Video media not found: {media_id}")
        return {"status": "missing"}

    file_path = media.file.path
    user_id = str(media.user_id)
    media_id_str = str(media.media_id)

    try:
        duration_float = extract_video_duration(file_path)
        if duration_float is not None:
            if duration_float > MAX_VIDEO_DURATION:
                delete_related_video_files(media)
                media.status = MediaFile.STATUS_FAILED
                media.save(update_fields=["status"])
                return {"status": "failed", "reason": "duration"}
            media.duration = int(duration_float)

        thumbnail_url = generate_thumbnail(file_path, user_id, media_id_str)
        if thumbnail_url:
            media.thumbnail_url = thumbnail_url

        playback_path, playback_url = transcode_video(file_path, user_id, media_id_str)
        media.url = playback_url
        if os.path.exists(playback_path):
            media.file_size = os.path.getsize(playback_path)

        hls_url = generate_hls(playback_path, user_id, media_id_str)
        if hls_url:
            media.hls_url = hls_url

        media.status = MediaFile.STATUS_READY
        media.save(update_fields=["duration", "thumbnail_url", "url", "file_size", "hls_url", "status"])
        return {"status": "ready", "media_id": media_id}
    except Exception as exc:
        media.status = MediaFile.STATUS_FAILED
        media.save(update_fields=["status"])
        logger.warning(f"process_video_media failed for {media_id}: {exc}")
        raise self.retry(exc=exc)
