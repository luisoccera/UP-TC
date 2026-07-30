export const LOCAL_DATABASE_NAME = "rutastack-local";
export const LOCAL_DATABASE_VERSION = 3;
export const PROGRESS_STORE_NAME = "progress";

export function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      LOCAL_DATABASE_NAME,
      LOCAL_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
        database.createObjectStore(PROGRESS_STORE_NAME);
      }

      if (database.objectStoreNames.contains("users")) {
        database.deleteObjectStore("users");
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
