#!/usr/bin/env python3
"""
シードデータ投入スクリプト
指示書 2.1 に基づく: ユーザー10人・投稿100件・フォロー関係
画像URL: https://picsum.photos/1080/1080?random={id}
"""
import requests
import random
import json

BASE_URL = "http://localhost:8888/api/v1"
PICSUM_BASE_URL = "https://picsum.photos/id"
LOCATIONS = ["Tokyo", "Osaka", "Kyoto", "Fukuoka", ""]

USERS = [
    {"username": "alice_photo",   "email": "alice@example.com",   "password": "Pass1234!", "bio": "写真が好き📸",                "profile_img": f"{PICSUM_BASE_URL}/200/150/150"},
    {"username": "bob_traveler",  "email": "bob@example.com",     "password": "Pass1234!", "bio": "旅好きのフォトグラファー",     "profile_img": f"{PICSUM_BASE_URL}/201/150/150"},
    {"username": "carol_art",     "email": "carol@example.com",   "password": "Pass1234!", "bio": "アート＆デザイン",            "profile_img": f"{PICSUM_BASE_URL}/202/150/150"},
    {"username": "dave_street",   "email": "dave@example.com",    "password": "Pass1234!", "bio": "ストリートフォト",             "profile_img": f"{PICSUM_BASE_URL}/203/150/150"},
    {"username": "eva_nature",    "email": "eva@example.com",     "password": "Pass1234!", "bio": "自然写真家🌿",                "profile_img": f"{PICSUM_BASE_URL}/204/150/150"},
    {"username": "frank_food",    "email": "frank@example.com",   "password": "Pass1234!", "bio": "料理と旅",                   "profile_img": f"{PICSUM_BASE_URL}/205/150/150"},
    {"username": "grace_fashion", "email": "grace@example.com",   "password": "Pass1234!", "bio": "ファッション&ライフスタイル", "profile_img": f"{PICSUM_BASE_URL}/206/150/150"},
    {"username": "hiro_sports",   "email": "hiro@example.com",    "password": "Pass1234!", "bio": "スポーツ写真",                "profile_img": f"{PICSUM_BASE_URL}/207/150/150"},
    {"username": "iris_pets",     "email": "iris@example.com",    "password": "Pass1234!", "bio": "動物写真🐾",                 "profile_img": f"{PICSUM_BASE_URL}/208/150/150"},
    {"username": "jack_arch",     "email": "jack@example.com",    "password": "Pass1234!", "bio": "建築フォトグラファー",         "profile_img": f"{PICSUM_BASE_URL}/209/150/150"},
]

CAPTIONS = [
    "今日も素晴らしい一日 ☀️",
    "この瞬間を切り取った #photography",
    "旅の思い出 ✈️ #travel",
    "自然の美しさに感動 🌿 #nature",
    "光と影のコントラスト #art",
    "街の喧騒の中で #street",
    "美味しいものを食べた 🍜 #food",
    "今日のお気に入りカット 📸",
    "夕暮れ時の空が最高 🌅 #sunset",
    "週末の散歩写真 #weekend",
    "友達と過ごした時間 #friends",
    "新しい発見がある毎日 #life",
    "色彩の魔法 #colorful",
    "ゴールデンアワーの光 #goldenhour",
    "シンプルが一番 #minimal",
]

def register_user(user_data):
    try:
        resp = requests.post(f"{BASE_URL}/auth/register/", json=user_data, timeout=10)
        if resp.status_code == 201:
            data = resp.json()
            print(f"  ✓ 登録: @{user_data['username']}")
            return data["access"]
        elif resp.status_code == 400:
            # username or email already exists — try login
            login_resp = requests.post(f"{BASE_URL}/auth/login/", json={
                "username": user_data["username"],
                "password": user_data["password"],
            }, timeout=10)
            if login_resp.status_code == 200:
                print(f"  ~ 既存ログイン: @{user_data['username']}")
                return login_resp.json()["access"]
            # email taken by different username — register with modified username
            alt_username = user_data["username"] + "_" + str(random.randint(10, 99))
            alt_data = {**user_data, "username": alt_username, "email": f"{alt_username}@example.com"}
            alt_resp = requests.post(f"{BASE_URL}/auth/register/", json=alt_data, timeout=10)
            if alt_resp.status_code == 201:
                print(f"  ✓ 代替登録: @{alt_username}")
                return alt_resp.json()["access"]
    except Exception as e:
        print(f"  ✗ エラー ({user_data['username']}): {e}")
    return None


def set_profile_image(token, profile_img):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.patch(f"{BASE_URL}/users/me/", json={"profile_img": profile_img}, headers=headers, timeout=10)
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"  ✗ プロフィール画像更新エラー: {e}")
    return False


def create_post(token, post_num, author_num):
    caption = random.choice(CAPTIONS)
    img_id = random.randint(1, 500)
    payload = {
        "caption": caption,
        "media_files": [{"media_url": f"{PICSUM_BASE_URL}/{img_id}/1080/1080", "media_order": 1}],
        "media_type": "photo",
        "location": random.choice(LOCATIONS),
    }
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.post(f"{BASE_URL}/posts/", json=payload, headers=headers, timeout=10)
        if resp.status_code == 201:
            data = resp.json()
            return data.get("post_id") or data.get("id") or f"post_{post_num}"
        else:
            print(f"    ✗ 投稿失敗 ({resp.status_code}): {resp.text[:100]}")
    except Exception as e:
        print(f"    ✗ 投稿エラー: {e}")
    return None


def follow_user(token, username):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.post(f"{BASE_URL}/users/{username}/follow/", headers=headers, timeout=10)
        return resp.status_code in (200, 201, 400)  # 400 = already following
    except:
        return False


def main():
    print("=== シードデータ投入開始 ===\n")

    # 1. ユーザー登録
    print("[1] ユーザー登録 (10人)")
    tokens = {}
    for user in USERS:
        token = register_user(user)
        if token:
            tokens[user["username"]] = token
            if user.get("profile_img"):
                set_profile_image(token, user["profile_img"])

    if not tokens:
        print("✗ ユーザー登録に失敗しました")
        return

    usernames = list(tokens.keys())
    print(f"\n  → {len(tokens)}人登録完了\n")

    # 2. フォロー関係の構築
    print("[2] フォロー関係構築")
    follow_count = 0
    for i, username in enumerate(usernames):
        token = tokens[username]
        # 各ユーザーが3〜6人をフォロー
        follow_targets = random.sample(
            [u for u in usernames if u != username],
            min(random.randint(3, 6), len(usernames) - 1)
        )
        for target in follow_targets:
            if follow_user(token, target):
                follow_count += 1
    print(f"  → {follow_count}件のフォロー関係を構築\n")

    # 3. 投稿作成 (各ユーザー10件 = 合計100件)
    print("[3] 投稿作成 (各ユーザー10件 = 合計100件)")
    total_posts = 0
    for i, username in enumerate(usernames):
        token = tokens[username]
        user_posts = 0
        for j in range(10):
            post_id = create_post(token, j, i)
            if post_id:
                user_posts += 1
                total_posts += 1
        print(f"  ✓ @{username}: {user_posts}件投稿")

    print(f"\n  → 合計{total_posts}件の投稿を作成\n")

    print("=== シードデータ投入完了 ===")
    print(f"  ユーザー: {len(tokens)}人")
    print(f"  フォロー: {follow_count}件")
    print(f"  投稿:     {total_posts}件")


if __name__ == "__main__":
    main()
