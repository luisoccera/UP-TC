import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the RutaStack product instead of the starter preview", async () => {
  const [page, layout, app, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/LearningApp.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /<LearningApp \/>/);
  assert.match(layout, /RutaStack/);
  assert.match(layout, /lang="es"/);
  assert.match(app, /Laboratorio/);
  assert.match(app, /Entrevistas/);
  assert.match(app, /indexedDB\.open/);
  assert.match(app, /Comprobar solución/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
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
