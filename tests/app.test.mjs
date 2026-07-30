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

test("uses verified cloud accounts and keeps only an offline progress cache", async () => {
  const [auth, storage, client, repository, migration] = await Promise.all([
    readFile(new URL("app/components/AuthGate.tsx", root), "utf8"),
    readFile(new URL("app/localDatabase.ts", root), "utf8"),
    readFile(new URL("app/supabaseClient.ts", root), "utf8"),
    readFile(new URL("app/progressRepository.ts", root), "utf8"),
    readFile(
      new URL(
        "supabase/migrations/202607240001_accounts_and_progress.sql",
        root,
      ),
      "utf8",
    ),
  ]);

  assert.match(auth, /type="email"/);
  assert.match(auth, /autoComplete="username"/);
  assert.match(auth, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(auth, /\.auth\.signUp/);
  assert.match(auth, /\.auth\.verifyOtp/);
  assert.match(auth, /\.auth\.signInWithPassword/);
  assert.match(auth, /\.auth\.resetPasswordForEmail/);
  assert.match(client, /VITE_SUPABASE_URL/);
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(repository, /function progressKey\(userId: string\)/);
  assert.match(repository, /\.from\("learning_progress"\)\.upsert/);
  assert.match(storage, /LOCAL_DATABASE_VERSION = 3/);
  assert.match(storage, /deleteObjectStore\("users"\)/);
  assert.doesNotMatch(auth, /PBKDF2|passwordHash/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /on delete cascade/);
});

test("supports in-app and web account deletion through an authenticated server function", async () => {
  const [app, account, edgeFunction, webPortal] = await Promise.all([
    readFile(new URL("app/components/LearningApp.tsx", root), "utf8"),
    readFile(new URL("app/accountRepository.ts", root), "utf8"),
    readFile(
      new URL("supabase/functions/delete-account/index.ts", root),
      "utf8",
    ),
    readFile(
      new URL("app/components/DeleteAccountPortal.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(app, /Eliminar mi cuenta/);
  assert.match(app, /escribe ELIMINAR/);
  assert.match(account, /\.functions\.invoke\("delete-account"/);
  assert.match(edgeFunction, /auth\.admin\.deleteUser/);
  assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edgeFunction, /admin\.auth\.getUser\(token\)/);
  assert.match(webPortal, /Solicita la eliminación de tu cuenta/);
  assert.match(webPortal, /signInWithPassword/);
  assert.match(webPortal, /deleteCurrentAccount/);
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

test("includes native Android and iOS projects with one stable app id", async () => {
  const [capacitor, packageJson, android, androidManifest, iosInfo] =
    await Promise.all([
      readFile(new URL("capacitor.config.ts", root), "utf8"),
      readFile(new URL("package.json", root), "utf8"),
      readFile(new URL("android/app/build.gradle", root), "utf8"),
      readFile(
        new URL("android/app/src/main/AndroidManifest.xml", root),
        "utf8",
      ),
      readFile(new URL("ios/App/App/Info.plist", root), "utf8"),
    ]);

  assert.match(capacitor, /com\.upconsultancy\.trainingcenter/);
  assert.match(capacitor, /appName:\s*"UP Training Center"/);
  assert.match(capacitor, /webDir:\s*"desktop\/dist"/);
  assert.match(packageJson, /"@capacitor\/android"/);
  assert.match(packageJson, /"@capacitor\/ios"/);
  assert.match(android, /applicationId "com\.upconsultancy\.trainingcenter"/);
  assert.match(androidManifest, /android\.permission\.INTERNET/);
  assert.match(iosInfo, /UP Training Center/);
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
