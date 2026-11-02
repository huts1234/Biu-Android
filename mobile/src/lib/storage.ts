import type { PersistStorage, StorageValue } from "zustand/middleware";

const prefix = "biu.mobile.";

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(prefix + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    /* storage full / private mode */
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(prefix + key);
  } catch {
    /* noop */
  }
}

export function hasKey(key: string) {
  return localStorage.getItem(prefix + key) !== null;
}

/** zustand `persist` friendly storage backed by localStorage. */
export function createPersistStorage(name: string): PersistStorage<any> {
  const fullKey = prefix + name;

  return {
    getItem: (key: string) => {
      try {
        const raw = localStorage.getItem(fullKey + key);
        return raw ? (JSON.parse(raw) as StorageValue<any>) : null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: StorageValue<any>) => {
      try {
        localStorage.setItem(fullKey + key, JSON.stringify(value));
      } catch {
        /* noop */
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(fullKey + key);
      } catch {
        /* noop */
      }
    },
  };
}
