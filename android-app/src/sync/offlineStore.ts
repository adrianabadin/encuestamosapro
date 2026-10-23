import type {
  SurveySubmissionPayload,
  ContactSubmissionPayload,
} from "../../../src/lib/survey/validator";
import {
  DEFAULT_SURVEY_SCHEMA,
  SurveySchema,
} from "../../../src/lib/survey/default-schema";

export interface KeyValueStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryKeyValueAdapter implements KeyValueStorageAdapter {
  private map = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

const KEY_PENDING_RESPONSES = "mosapro_android_pending_responses_v1";
const KEY_PENDING_CONTACTS = "mosapro_android_pending_contacts_v1";
const KEY_SYNCED_COUNT = "mosapro_android_synced_count_v1";
const KEY_CACHED_SCHEMA = "mosapro_android_cached_schema_v2";
const KEY_ACTIVE_DRAFT = "mosapro_android_active_draft_v2";
const KEY_FIELD_SETTINGS = "mosapro_android_field_settings_v1";

export interface FieldSurveyorSettings {
  defaultRegion: string;
  surveyorAlias?: string;
}

export interface QueueSummary {
  pendingResponsesCount: number;
  inProgressDraftsCount: number;
  completedPendingCount: number;
  pendingContactsCount: number;
  totalSyncedHistoryCount: number;
  lastSyncedAt: string | null;
}

export class AndroidOfflineSyncManager {
  private storage: KeyValueStorageAdapter;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private isFlushing = false;
  private lastSyncedAt: string | null = null;

  constructor(options: {
    storage: KeyValueStorageAdapter;
    baseUrl: string;
    fetchImpl?: typeof fetch;
  }) {
    this.storage = options.storage;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl || fetch;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/+$/, "");
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getFieldSettings(): Promise<FieldSurveyorSettings> {
    const raw = await this.storage.getItem(KEY_FIELD_SETTINGS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          defaultRegion: parsed.defaultRegion || "",
          surveyorAlias: parsed.surveyorAlias || "",
        };
      } catch {
        // ignore
      }
    }
    return {
      defaultRegion: "",
      surveyorAlias: "",
    };
  }

  async saveFieldSettings(settings: FieldSurveyorSettings): Promise<void> {
    await this.storage.setItem(KEY_FIELD_SETTINGS, JSON.stringify(settings));
  }

  async getCachedSchema(): Promise<SurveySchema> {
    const raw = await this.storage.getItem(KEY_CACHED_SCHEMA);
    if (raw) {
      try {
        return JSON.parse(raw) as SurveySchema;
      } catch {
        // ignore
      }
    }
    return DEFAULT_SURVEY_SCHEMA;
  }

  async fetchAndCacheRemoteSchema(): Promise<SurveySchema> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/v1/survey`);
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.survey) {
          await this.storage.setItem(
            KEY_CACHED_SCHEMA,
            JSON.stringify(data.survey)
          );
          return data.survey as SurveySchema;
        }
      }
    } catch {
      // Offline: return local cached schema
    }
    return this.getCachedSchema();
  }

  async getPendingResponses(): Promise<SurveySubmissionPayload[]> {
    const raw = await this.storage.getItem(KEY_PENDING_RESPONSES);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SurveySubmissionPayload[];
    } catch {
      return [];
    }
  }

  async getPendingContacts(): Promise<ContactSubmissionPayload[]> {
    const raw = await this.storage.getItem(KEY_PENDING_CONTACTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ContactSubmissionPayload[];
    } catch {
      return [];
    }
  }

  private async savePendingResponses(
    list: SurveySubmissionPayload[]
  ): Promise<void> {
    await this.storage.setItem(KEY_PENDING_RESPONSES, JSON.stringify(list));
  }

  private async savePendingContacts(
    list: ContactSubmissionPayload[]
  ): Promise<void> {
    await this.storage.setItem(KEY_PENDING_CONTACTS, JSON.stringify(list));
  }

  async saveAndTrySyncResponse(
    payload: SurveySubmissionPayload
  ): Promise<{ syncedNow: boolean }> {
    const existing = await this.getPendingResponses();
    const idx = existing.findIndex(
      (item) => item.clientSubmissionId === payload.clientSubmissionId
    );
    const enriched: SurveySubmissionPayload = {
      ...payload,
      sourcePlatform: "android",
    };

    if (idx >= 0) {
      existing[idx] = enriched;
    } else {
      existing.push(enriched);
    }
    await this.savePendingResponses(existing);

    const flushRes = await this.flushAllPendingWhenOnline();
    return { syncedNow: flushRes.syncedResponses > 0 };
  }

  async saveAndTrySyncContact(
    payload: ContactSubmissionPayload
  ): Promise<{ syncedNow: boolean }> {
    const existing = await this.getPendingContacts();
    const idx = existing.findIndex(
      (item) => item.clientSubmissionId === payload.clientSubmissionId
    );
    const enriched: ContactSubmissionPayload = {
      ...payload,
      sourcePlatform: "android",
    };

    if (idx >= 0) {
      existing[idx] = enriched;
    } else {
      existing.push(enriched);
    }
    await this.savePendingContacts(existing);

    const flushRes = await this.flushAllPendingWhenOnline();
    return { syncedNow: flushRes.syncedContacts > 0 };
  }

  async flushAllPendingWhenOnline(): Promise<{
    syncedResponses: number;
    syncedContacts: number;
  }> {
    if (this.isFlushing) {
      return { syncedResponses: 0, syncedContacts: 0 };
    }
    this.isFlushing = true;

    let syncedResponses = 0;
    let syncedContacts = 0;

    try {
      const pendingResponses = await this.getPendingResponses();
      if (pendingResponses.length > 0) {
        try {
          const res = await this.fetchImpl(
            `${this.baseUrl}/api/v1/sync/responses`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: pendingResponses }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const accepted: string[] = data?.accepted || [];
            if (accepted.length > 0) {
              const acceptedSet = new Set(accepted);
              const remaining = pendingResponses.filter(
                (r) => !acceptedSet.has(r.clientSubmissionId)
              );
              await this.savePendingResponses(remaining);
              syncedResponses = accepted.length;
              await this.incrementSyncedCount(accepted.length);
              this.lastSyncedAt = new Date().toISOString();
            }
          }
        } catch {
          // Offline or unreachable: keep in local queue
        }
      }

      const pendingContacts = await this.getPendingContacts();
      if (pendingContacts.length > 0) {
        try {
          const res = await this.fetchImpl(
            `${this.baseUrl}/api/v1/sync/contacts`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: pendingContacts }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const accepted: string[] = data?.accepted || [];
            if (accepted.length > 0) {
              const acceptedSet = new Set(accepted);
              const remaining = pendingContacts.filter(
                (c) => !acceptedSet.has(c.clientSubmissionId)
              );
              await this.savePendingContacts(remaining);
              syncedContacts = accepted.length;
              this.lastSyncedAt = new Date().toISOString();
            }
          }
        } catch {
          // Offline or unreachable: keep in local queue
        }
      }
    } finally {
      this.isFlushing = false;
    }

    return { syncedResponses, syncedContacts };
  }

  private async incrementSyncedCount(delta: number): Promise<void> {
    const raw = await this.storage.getItem(KEY_SYNCED_COUNT);
    const current = raw ? parseInt(raw, 10) || 0 : 0;
    await this.storage.setItem(KEY_SYNCED_COUNT, String(current + delta));
  }

  async getQueueSummary(): Promise<QueueSummary> {
    const [resps, contacts, syncedRaw] = await Promise.all([
      this.getPendingResponses(),
      this.getPendingContacts(),
      this.storage.getItem(KEY_SYNCED_COUNT),
    ]);
    const inProgress = resps.filter((r) => r.isComplete === false).length;
    const completedPending = resps.length - inProgress;
    const totalSyncedHistoryCount = syncedRaw ? parseInt(syncedRaw, 10) || 0 : 0;

    return {
      pendingResponsesCount: resps.length,
      inProgressDraftsCount: inProgress,
      completedPendingCount: completedPending,
      pendingContactsCount: contacts.length,
      totalSyncedHistoryCount,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  async saveActiveDraftState(draftJson: Record<string, unknown>): Promise<void> {
    await this.storage.setItem(KEY_ACTIVE_DRAFT, JSON.stringify(draftJson));
  }

  async loadActiveDraftState(): Promise<Record<string, unknown> | null> {
    const raw = await this.storage.getItem(KEY_ACTIVE_DRAFT);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async clearActiveDraftState(): Promise<void> {
    await this.storage.removeItem(KEY_ACTIVE_DRAFT);
  }
}
