import {
  SurveySubmissionPayload,
  ContactSubmissionPayload,
} from "../survey/validator";
import { SurveySchema, DEFAULT_SURVEY_SCHEMA } from "../survey/default-schema";

const DB_NAME = "mosapro_offline_db";
const DB_VERSION = 1;
const STORE_RESPONSES = "pending_responses";
const STORE_CONTACTS = "pending_contacts";
const CACHE_KEY_SURVEY = "mosapro_cached_survey_v1";

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RESPONSES)) {
        db.createObjectStore(STORE_RESPONSES, { keyPath: "clientSubmissionId" });
      }
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        db.createObjectStore(STORE_CONTACTS, { keyPath: "clientSubmissionId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineResponse(
  payload: SurveySubmissionPayload
): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESPONSES, "readwrite");
    tx.objectStore(STORE_RESPONSES).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueOfflineContact(
  payload: ContactSubmissionPayload
): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, "readwrite");
    tx.objectStore(STORE_CONTACTS).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingResponses(): Promise<SurveySubmissionPayload[]> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RESPONSES, "readonly");
      const req = tx.objectStore(STORE_RESPONSES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getPendingContacts(): Promise<ContactSubmissionPayload[]> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONTACTS, "readonly");
      const req = tx.objectStore(STORE_CONTACTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeSyncedResponses(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESPONSES, "readwrite");
    const store = tx.objectStore(STORE_RESPONSES);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncedContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, "readwrite");
    const store = tx.objectStore(STORE_CONTACTS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Items per sync request; below the server cap (MAX_SYNC_BATCH_ITEMS = 50)
// and its 1 MB body limit, so a large offline backlog still drains.
export const SYNC_CHUNK_SIZE = 25;

// Sends items in chunks and stops at the first failed or rejected request
// (offline, 429, 413). Returns the ids accepted so far; the rest stay queued
// in IndexedDB for the next online event.
async function postInChunks(
  url: string,
  items: { clientSubmissionId: string }[]
): Promise<string[]> {
  const accepted: string[] = [];
  for (let i = 0; i < items.length; i += SYNC_CHUNK_SIZE) {
    const chunk = items.slice(i, i + SYNC_CHUNK_SIZE);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: chunk }),
      });
      if (!res.ok) break;
      const data = await res.json();
      accepted.push(...((data?.accepted as string[]) || []));
    } catch {
      break;
    }
  }
  return accepted;
}

export async function flushOfflineQueues(): Promise<{
  syncedResponses: number;
  syncedContacts: number;
  remainingResponses: number;
  remainingContacts: number;
}> {
  const pendingResps = await getPendingResponses();
  const pendingContacts = await getPendingContacts();
  let syncedResponses = 0;
  let syncedContacts = 0;

  if (pendingResps.length > 0) {
    const accepted = await postInChunks("/api/v1/sync/responses", pendingResps);
    await removeSyncedResponses(accepted);
    syncedResponses = accepted.length;
  }

  if (pendingContacts.length > 0) {
    const accepted = await postInChunks("/api/v1/sync/contacts", pendingContacts);
    await removeSyncedContacts(accepted);
    syncedContacts = accepted.length;
  }

  const afterResps = await getPendingResponses();
  const afterContacts = await getPendingContacts();

  return {
    syncedResponses,
    syncedContacts,
    remainingResponses: afterResps.length,
    remainingContacts: afterContacts.length,
  };
}

export function getCachedSurveySchema(): SurveySchema {
  if (typeof window === "undefined") return DEFAULT_SURVEY_SCHEMA;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_SURVEY);
    if (raw) {
      return JSON.parse(raw) as SurveySchema;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SURVEY_SCHEMA;
}

export function saveCachedSurveySchema(schema: SurveySchema): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY_SURVEY, JSON.stringify(schema));
  } catch {
    // ignore
  }
}
