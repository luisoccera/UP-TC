/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");

const APP_ID = "com.upconsultancy.trainingcenter";
const DIST_ROOT = path.resolve(__dirname, "dist");

app.setAppUserModelId(APP_ID);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

let mainWindow;
let localServer;

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webmanifest": "application/manifest+json",
    }[extension] ?? "application/octet-stream"
  );
}

async function staticResponse(request, response) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";

  let filePath = path.resolve(DIST_ROOT, `.${pathname}`);
  if (
    filePath !== DIST_ROOT &&
    !filePath.startsWith(`${DIST_ROOT}${path.sep}`)
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    // Las rutas de la aplicación se resuelven en React.
    filePath = path.join(DIST_ROOT, "index.html");
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": filePath.endsWith("index.html")
        ? "no-store"
        : "public, max-age=31536000, immutable",
      "Content-Type": contentType(filePath),
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      void staticResponse(request, response);
    });
    localServer.once("error", reject);
    localServer.listen(0, "127.0.0.1", () => {
      const address = localServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("No se pudo abrir el servidor local."));
        return;
      }
      resolve(`http://localhost:${address.port}`);
    });
  });
}

function createWindow(appOrigin) {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f3f0",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appOrigin)) return;
    event.preventDefault();
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
  });

  void mainWindow.loadURL(appOrigin);
  mainWindow.once("ready-to-show", () => mainWindow.show());
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  const appOrigin = await startLocalServer();
  createWindow(appOrigin);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appOrigin);
  });
});

app.on("before-quit", () => {
  localServer?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
