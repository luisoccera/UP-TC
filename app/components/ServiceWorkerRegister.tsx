"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app sigue siendo utilizable en línea si el navegador bloquea el SW.
      });
    }
  }, []);

  return null;
}
