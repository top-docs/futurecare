const STORAGE_KEY = "futurecare.session.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type RemovableStorageLike = Pick<Storage, "removeItem">;

export type SafeSessionAccess = {
  sessionId: string;
  recoveryAvailable: boolean;
};

export function getOrCreateSessionId(storage: StorageLike, createId = () => crypto.randomUUID()) {
  const existing = storage.getItem(STORAGE_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(existing)) return existing;
  const sessionId = createId();
  storage.setItem(STORAGE_KEY, sessionId);
  return sessionId;
}

export function clearSessionId(storage: RemovableStorageLike) {
  storage.removeItem(STORAGE_KEY);
}

export function getSafeSessionAccess(
  getStorage: () => StorageLike,
  createId = () => crypto.randomUUID(),
): SafeSessionAccess {
  const fallbackId = createId();
  try {
    return {
      sessionId: getOrCreateSessionId(getStorage(), () => fallbackId),
      recoveryAvailable: true,
    };
  } catch {
    return { sessionId: fallbackId, recoveryAvailable: false };
  }
}

export function getSafeSessionAccessForEntry(
  getStorage: () => StorageLike & RemovableStorageLike,
  startNew: boolean,
  createId = () => crypto.randomUUID(),
): SafeSessionAccess {
  return getSafeSessionAccess(() => {
    const storage = getStorage();
    if (startNew) clearSessionId(storage);
    return storage;
  }, createId);
}
