import {
  openLocalDatabase,
  PROGRESS_STORE_NAME,
} from "./localDatabase";
import { account } from "./appwriteClient";

type LocalProgressEnvelope = {
  progress: unknown;
  updatedAt: string;
  pendingSync: boolean;
};

export type LoadedProgress = {
  progress: unknown | null;
  synced: boolean;
};

function progressKey(userId: string) {
  return `user:${userId}`;
}

function isProgressEnvelope(value: unknown): value is LocalProgressEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalProgressEnvelope>;
  return (
    "progress" in candidate &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.pendingSync === "boolean"
  );
}

async function readLocalProgress(
  userId: string,
): Promise<LocalProgressEnvelope | null> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROGRESS_STORE_NAME, "readonly");
    const request = transaction
      .objectStore(PROGRESS_STORE_NAME)
      .get(progressKey(userId));
    request.onsuccess = () => {
      const result = request.result as unknown;
      if (!result) {
        resolve(null);
      } else if (isProgressEnvelope(result)) {
        resolve(result);
      } else {
        resolve({
          progress: result,
          updatedAt: new Date(0).toISOString(),
          pendingSync: true,
        });
      }
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeLocalProgress(
  userId: string,
  envelope: LocalProgressEnvelope,
): Promise<void> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROGRESS_STORE_NAME, "readwrite");
    transaction
      .objectStore(PROGRESS_STORE_NAME)
      .put(envelope, progressKey(userId));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function pushRemoteProgress(
  userId: string,
  envelope: LocalProgressEnvelope,
) {
  if (!account) return false;
  const current = await account.get();
  if (current.$id !== userId) {
    throw new Error("La sesión activa no pertenece a este progreso.");
  }
  await account.updatePrefs({
    prefs: {
      progressSchemaVersion: 1,
      progress: envelope.progress,
      progressUpdatedAt: envelope.updatedAt,
    },
  });
  await writeLocalProgress(userId, {
    ...envelope,
    pendingSync: false,
  });
  return true;
}

export async function loadSyncedProgress(
  userId: string,
): Promise<LoadedProgress> {
  const local = await readLocalProgress(userId);
  if (!account) {
    return { progress: local?.progress ?? null, synced: false };
  }

  try {
    const current = await account.get();
    if (current.$id !== userId) {
      throw new Error("La sesión activa no pertenece a este progreso.");
    }
    const prefs = await account.getPrefs<{
      progress?: unknown;
      progressUpdatedAt?: string;
      progressSchemaVersion?: number;
    }>();
    const remote =
      "progress" in prefs && typeof prefs.progressUpdatedAt === "string"
        ? {
            progress: prefs.progress,
            updatedAt: prefs.progressUpdatedAt,
            pendingSync: false,
          }
        : null;

    if (
      local &&
      (!remote ||
        Date.parse(local.updatedAt) > Date.parse(remote.updatedAt))
    ) {
      const synced = await pushRemoteProgress(userId, local);
      return { progress: local.progress, synced };
    }

    if (remote) {
      await writeLocalProgress(userId, remote);
      return { progress: remote.progress, synced: true };
    }

    return { progress: null, synced: true };
  } catch {
    return { progress: local?.progress ?? null, synced: false };
  }
}

export async function saveSyncedProgress(
  progress: unknown,
  userId: string,
): Promise<boolean> {
  const envelope: LocalProgressEnvelope = {
    progress,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  };
  await writeLocalProgress(userId, envelope);

  try {
    return await pushRemoteProgress(userId, envelope);
  } catch {
    return false;
  }
}

export async function clearLocalProgress(userId: string): Promise<void> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROGRESS_STORE_NAME, "readwrite");
    transaction
      .objectStore(PROGRESS_STORE_NAME)
      .delete(progressKey(userId));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
