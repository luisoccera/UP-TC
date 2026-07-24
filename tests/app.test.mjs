import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the UP Training Center product instead of the starter preview", async () => {
  const [page, layout, app, storage, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/LearningApp.tsx", root), "utf8"),
    readFile(new URL("app/localDatabase.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /<LearningApp \/>/);
  assert.match(layout, /UP Training Center/);
  assert.match(layout, /lang="es"/);
  assert.match(app, /Laboratorio/);
  assert.match(app, /Entrevistas/);
  assert.match(app, /UP Training Center/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(app, /Comprobar solución/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});

test("registers local accounts with protected credentials and isolated progress", async () => {
  const [auth, app, storage] = await Promise.all([
    readFile(new URL("app/components/AuthGate.tsx", root), "utf8"),
    readFile(new URL("app/components/LearningApp.tsx", root), "utf8"),
    readFile(new URL("app/localDatabase.ts", root), "utf8"),
  ]);

  assert.match(auth, /type="email"/);
  assert.match(auth, /autoComplete="username"/);
  assert.match(auth, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /SHA-256/);
  assert.match(auth, /210_000/);
  assert.match(storage, /LOCAL_DATABASE_VERSION = 2/);
  assert.match(storage, /createIndex\("email", "email", \{ unique: true \}\)/);
  assert.match(storage, /createIndex\("username", "username", \{ unique: true \}\)/);
  assert.match(app, /function progressKey\(userId: string\)/);
  assert.doesNotMatch(app, /LEGACY_PROGRESS_KEY|store\.get\("current"\)/);
});

test("includes a portable Windows desktop package", async () => {
  const [packageJson, desktopPackage, desktopConfig, desktopMain, desktopVite] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("desktop/package.json", root), "utf8"),
    readFile(new URL("desktop/electron-builder.yml", root), "utf8"),
    readFile(new URL("desktop/main.cjs", root), "utf8"),
    readFile(new URL("vite.desktop.config.ts", root), "utf8"),
  ]);

  const packageConfig = JSON.parse(packageJson);
  const desktopPackageConfig = JSON.parse(desktopPackage);
  assert.equal(packageConfig.main, "desktop/main.cjs");
  assert.equal(desktopPackageConfig.main, "main.cjs");
  assert.match(desktopConfig, /productName: UP Training Center/);
  assert.match(desktopConfig, /target: portable/);
  assert.match(desktopMain, /BrowserWindow/);
  assert.match(desktopMain, /contextIsolation:\s*true/);
  assert.match(desktopMain, /nodeIntegration:\s*false/);
  assert.match(desktopVite, /outDir:\s*"dist"/);
});

test("starts progress at zero and derives mastery from demonstrated work", async () => {
  const app = await readFile(
    new URL("app/components/LearningApp.tsx", root),
    "utf8",
  );

  assert.match(app, /const initialProgress:[\s\S]*?xp:\s*0/);
  assert.match(app, /const initialProgress:[\s\S]*?streak:\s*0/);
  assert.match(app, /csharp:\s*0/);
  assert.match(app, /java:\s*0/);
  assert.match(app, /sql:\s*0/);
  assert.match(app, /function calculateMastery/);
  assert.match(app, /function normalizeProgress/);
  assert.doesNotMatch(app, /csharp:\s*18|xp:\s*120/);
});

test("keeps the compact interview card inside the mobile viewport", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(
    css,
    /\.interview-strip\s*\{\s*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/,
  );
});

test("includes install and offline assets", async () => {
  const [manifest, worker] = await Promise.all([
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8"),
  ]);

  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /start_url:\s*"\/"/);
  assert.match(worker, /CACHE_NAME/);
  assert.match(worker, /request\.mode === "navigate"/);
});

test("contains the requested learning domains and interview practice", async () => {
  const data = await readFile(new URL("app/data.ts", root), "utf8");

  for (const topic of [
    "C# profesional",
    "Java moderno",
    "SQL y datos",
    "Entity Framework Core",
    "ASP.NET MVC",
    "AJAX",
    "Microservicios",
  ]) {
    assert.match(data, new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(data, /InterviewQuestion/);
  assert.match(data, /Outbox transaccional/);
});

test("keeps primary reading colors above WCAG AA contrast", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");

  function color(token) {
    const match = css.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, "i"));
    assert.ok(match, `missing color token ${token}`);
    return match[1];
  }

  function luminance(hex) {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4),
      );
    return (
      0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    );
  }

  function contrast(foreground, background) {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }

  assert.ok(contrast(color("ink"), color("paper")) >= 7);
  assert.ok(contrast(color("muted"), color("paper")) >= 4.5);
  assert.ok(contrast(color("green"), color("lime")) >= 4.5);
});
