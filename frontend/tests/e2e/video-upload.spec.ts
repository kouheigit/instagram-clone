import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, "Set E2E_USERNAME and E2E_PASSWORD to run video upload E2E");

function createTinyVideo(outputPath: string) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  execFileSync("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", "testsrc=size=320x320:rate=24",
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t", "3",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-shortest",
    outputPath,
  ], { stdio: "ignore" });
}

test("uploads a video post and renders it in the feed", async ({ page }, testInfo) => {
  const videoPath = path.join(testInfo.outputDir, "upload-video.mp4");
  createTinyVideo(videoPath);
  const caption = `playwright video ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("ユーザー名またはメールアドレス").fill(username!);
  await page.getByLabel("パスワード").fill(password!);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: /作成/ }).click();
  await expect(page.getByText("新しい投稿を作成")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(videoPath);

  await expect(page.getByText("切り取り")).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await page.getByPlaceholder("キャプションを入力...").fill(caption);
  await page.getByRole("button", { name: "シェア" }).click();

  await expect(page.getByText("投稿がシェアされました。")).toBeVisible({ timeout: 240_000 });
  await page.getByRole("button", { name: "完了" }).click();

  await page.goto("/");
  await expect(page.getByText(caption)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("article video").first()).toBeVisible();
});
