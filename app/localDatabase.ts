export const LOCAL_DATABASE_NAME = "rutastack-local";
export const LOCAL_DATABASE_VERSION = 2;
export const PROGRESS_STORE_NAME = "progress";
export const USERS_STORE_NAME = "users";

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

      if (!database.objectStoreNames.contains(USERS_STORE_NAME)) {
        const users = database.createObjectStore(USERS_STORE_NAME, {
          keyPath: "id",
        });
        users.createIndex("email", "email", { unique: true });
        users.createIndex("username", "username", { unique: true });
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
