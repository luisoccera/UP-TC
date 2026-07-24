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
