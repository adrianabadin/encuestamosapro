import { describe, it, expect, vi } from "vitest";
import {
  AndroidOfflineSyncManager,
  MemoryKeyValueAdapter,
  SYNC_CHUNK_SIZE,
} from "../android-app/src/sync/offlineStore";

const dump = (adapter: MemoryKeyValueAdapter): string =>
  adapter
    .entries()
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

describe("Android Offline Store & Automatic Online Sync Engine (Phase 2 - S1, S2, S3, S4)", () => {
  it("stores step-by-step partial survey progress offline using the same clientSubmissionId and flushes automatically when online", async () => {
    const storage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage: new MemoryKeyValueAdapter(),
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const subId = "android-uuid-001";

    // Simulate offline failure on Step 1 save
    fetchMock.mockRejectedValueOnce(new Error("Network request failed"));

    const step1Result = await manager.saveAndTrySyncResponse({
      clientSubmissionId: subId,
      sourcePlatform: "android",
      isComplete: false,
      currentStep: "S1",
      consent: true,
      mainLocation: "hospital",
    });

    expect(step1Result.syncedNow).toBe(false);
    let summary = await manager.getQueueSummary();
    expect(summary.pendingResponsesCount).toBe(1);
    expect(summary.inProgressDraftsCount).toBe(1);

    // User advances to S2B while still offline -> updates the same entry in queue (still 1 item)
    fetchMock.mockRejectedValueOnce(new Error("Network request failed"));
    await manager.saveAndTrySyncResponse({
      clientSubmissionId: subId,
      sourcePlatform: "android",
      isComplete: false,
      currentStep: "S2B",
      consent: true,
      mainLocation: "hospital",
      section2B: {
        tipoHospital: "provincial",
        tarea: "medico",
        areaServicio: "Guardia / Emergencias",
      },
    });

    summary = await manager.getQueueSummary();
    expect(summary.pendingResponsesCount).toBe(1);
    const queued = await manager.getPendingResponses();
    expect(queued[0].currentStep).toBe("S2B");
    expect(queued[0].section2B?.areaServicio).toBe("Guardia / Emergencias");

    // Connectivity returns! Automatic online sync flushes pending queue to POST /api/v1/sync/responses
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        accepted: [subId],
        duplicates: [],
        rejected: [],
      }),
    });

    const flushRes = await manager.flushAllPendingWhenOnline();
    expect(flushRes.syncedResponses).toBe(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3082/api/v1/sync/responses",
      expect.objectContaining({
        method: "POST",
      })
    );

    summary = await manager.getQueueSummary();
    expect(summary.pendingResponsesCount).toBe(0);
    expect(summary.totalSyncedHistoryCount).toBe(1);
  });

  it("queues unlinked contact submissions offline and flushes them to /api/v1/sync/contacts when connection is restored (S4)", async () => {
    const storage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage: new MemoryKeyValueAdapter(),
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const contactId = "android-contact-001";

    // Offline when submitting contact
    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    const saveRes = await manager.saveAndTrySyncContact({
      clientSubmissionId: contactId,
      sourcePlatform: "android",
      nombre: "Lucía Fernández",
      telefono: "11-2233-4455",
      regionSanitaria: "VI",
      municipio: "Lomas de Zamora",
      tematicasInteres: ["Fuerza laboral", "Salud mental comunitaria"],
      ofreceReferente: true,
    });

    expect(saveRes.syncedNow).toBe(false);
    expect((await manager.getQueueSummary()).pendingContactsCount).toBe(1);

    // Online restore -> flushes contact
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        accepted: [contactId],
        duplicates: [],
        rejected: [],
      }),
    });

    const flushRes = await manager.flushAllPendingWhenOnline();
    expect(flushRes.syncedContacts).toBe(1);
    expect((await manager.getQueueSummary()).pendingContactsCount).toBe(0);
  });
});

describe("Android pending contacts encrypted at rest (S8)", () => {
  it("keeps a pending contact's PII out of the regular storage and inside the secure adapter", async () => {
    const storage = new MemoryKeyValueAdapter();
    const secureStorage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage,
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    const saveRes = await manager.saveAndTrySyncContact({
      clientSubmissionId: "android-contact-secure-001",
      sourcePlatform: "android",
      nombre: "María Secured",
      telefono: "54-777-0001",
      email: "maria.segura@example.test",
      regionSanitaria: "I",
      municipio: "Bahía Blanca",
      tematicasInteres: ["Fuerza laboral"],
      ofreceReferente: false,
      comentarios: "Comentario privado S8",
    });

    expect(saveRes.syncedNow).toBe(false);

    // The queued contact is still fully readable through the public API
    const pending = await manager.getPendingContacts();
    expect(pending).toHaveLength(1);
    expect(pending[0].nombre).toBe("María Secured");
    expect(pending[0].telefono).toBe("54-777-0001");
    expect(pending[0].email).toBe("maria.segura@example.test");

    // No PII may appear in ANY key of the regular (plain) storage adapter
    const plainDump = dump(storage);
    expect(plainDump).not.toContain("María Secured");
    expect(plainDump).not.toContain("54-777-0001");
    expect(plainDump).not.toContain("maria.segura@example.test");
    expect(plainDump).not.toContain("Comentario privado S8");

    // ...but the PII must be present in the secure adapter
    const secureDump = dump(secureStorage);
    expect(secureDump).toContain("María Secured");
    expect(secureDump).toContain("54-777-0001");
    expect(secureDump).toContain("maria.segura@example.test");
    expect(secureDump).toContain("Comentario privado S8");
  });

  it("migrates the legacy plain pending-contact list into secure storage and removes the plain key", async () => {
    const storage = new MemoryKeyValueAdapter();
    const secureStorage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    await storage.setItem(
      "mosapro_android_pending_contacts_v1",
      JSON.stringify([
        {
          clientSubmissionId: "cnt_and_legacy_001",
          sourcePlatform: "android",
          nombre: "Legacy Contact",
          telefono: "11-555-0002",
          email: "legacy@example.test",
          regionSanitaria: "VI",
          municipio: "Lomas de Zamora",
          tematicasInteres: ["Salud mental"],
          ofreceReferente: true,
          comentarios: "Dato heredado en texto plano",
        },
      ])
    );

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage,
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    // First load migrates and still exposes the queued contact
    const pending = await manager.getPendingContacts();
    expect(pending).toHaveLength(1);
    expect(pending[0].nombre).toBe("Legacy Contact");
    expect(pending[0].clientSubmissionId).toBe("cnt_and_legacy_001");

    // The legacy plain key is gone and no PII remains in plain storage
    expect(await storage.getItem("mosapro_android_pending_contacts_v1")).toBeNull();
    const plainDump = dump(storage);
    expect(plainDump).not.toContain("Legacy Contact");
    expect(plainDump).not.toContain("11-555-0002");
    expect(plainDump).not.toContain("Dato heredado en texto plano");

    // The contact now lives in the secure adapter
    const secureDump = dump(secureStorage);
    expect(secureDump).toContain("Legacy Contact");
    expect(secureDump).toContain("11-555-0002");
    expect(secureDump).toContain("cnt_and_legacy_001");
  });

  it("deletes the accepted contact's secure entry after a successful flush", async () => {
    const storage = new MemoryKeyValueAdapter();
    const secureStorage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage,
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const contactId = "android-contact-flush-001";

    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    await manager.saveAndTrySyncContact({
      clientSubmissionId: contactId,
      sourcePlatform: "android",
      nombre: "Flush Secure",
      telefono: "54-777-0003",
      regionSanitaria: "I",
      municipio: "Bahía Blanca",
      tematicasInteres: ["Fuerza laboral"],
    });

    // While pending, the contact lives in the secure adapter (one entry per contact)
    const beforeFlush = secureStorage.entries();
    expect(beforeFlush.some(([, value]) => value.includes(contactId))).toBe(true);
    expect(beforeFlush.some(([, value]) => value.includes("Flush Secure"))).toBe(true);

    // Connectivity returns -> flush accepts the contact
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        accepted: [contactId],
        duplicates: [],
        rejected: [],
      }),
    });

    const flushRes = await manager.flushAllPendingWhenOnline();
    expect(flushRes.syncedContacts).toBe(1);
    expect((await manager.getQueueSummary()).pendingContactsCount).toBe(0);

    // The accepted contact's secure entry has been deleted
    const afterFlush = secureStorage.entries();
    expect(
      afterFlush.some(([, value]) => value.includes(contactId))
    ).toBe(false);
    expect(afterFlush).toHaveLength(0);
    expect(await manager.getPendingContacts()).toEqual([]);
  });

  it("keeps every contact not returned in `accepted` queued with its secure entry intact", async () => {
    const storage = new MemoryKeyValueAdapter();
    const secureStorage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage,
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    await manager.saveAndTrySyncContact({
      clientSubmissionId: "android-contact-cap-001",
      sourcePlatform: "android",
      nombre: "Accepted One",
      telefono: "54-777-0004",
      regionSanitaria: "I",
      municipio: "Bahía Blanca",
      tematicasInteres: ["Fuerza laboral"],
    });
    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    await manager.saveAndTrySyncContact({
      clientSubmissionId: "android-contact-cap-002",
      sourcePlatform: "android",
      nombre: "Deferred Two",
      telefono: "54-777-0005",
      regionSanitaria: "I",
      municipio: "Bahía Blanca",
      tematicasInteres: ["Salud mental"],
    });
    expect((await manager.getPendingContacts()).length).toBe(2);

    // Server caps the batch: only the first id comes back as accepted
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        accepted: ["android-contact-cap-001"],
        duplicates: [],
        rejected: [],
      }),
    });

    const flushRes = await manager.flushAllPendingWhenOnline();
    expect(flushRes.syncedContacts).toBe(1);

    // The non-accepted contact stays queued, and only the accepted secure entry is gone
    const remaining = await manager.getPendingContacts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].clientSubmissionId).toBe("android-contact-cap-002");
    expect(remaining[0].nombre).toBe("Deferred Two");
    const secureDump = dump(secureStorage);
    expect(secureDump).not.toContain("android-contact-cap-001");
    expect(secureDump).toContain("Deferred Two");
    expect(dump(storage)).not.toContain("Deferred Two");
  });
});

describe("Android sync batching (S7 correction)", () => {
  it("flushes a large offline queue in requests of at most SYNC_CHUNK_SIZE items until it drains", async () => {
    const storage = new MemoryKeyValueAdapter();
    const sentBatchSizes: number[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: { body?: string }) => {
      const items = JSON.parse(init?.body || "{}").items || [];
      sentBatchSizes.push(items.length);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          accepted: items.map((i: { clientSubmissionId: string }) => i.clientSubmissionId),
          duplicates: [],
          rejected: [],
        }),
      };
    });

    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage: new MemoryKeyValueAdapter(),
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    // Fill the queue offline (each save tries to flush; make those attempts fail).
    fetchMock.mockImplementation(async () => {
      throw new Error("offline");
    });
    for (let i = 0; i < 60; i++) {
      await manager.saveAndTrySyncResponse({
        clientSubmissionId: `and_bulk_${i}`,
        sourcePlatform: "android",
        isComplete: false,
        currentStep: "S1",
        consent: true,
      });
    }
    expect((await manager.getQueueSummary()).pendingResponsesCount).toBe(60);

    fetchMock.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const items = JSON.parse(init?.body || "{}").items || [];
      sentBatchSizes.push(items.length);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          accepted: items.map((i: { clientSubmissionId: string }) => i.clientSubmissionId),
          duplicates: [],
          rejected: [],
        }),
      } as unknown as Response;
    });

    const res = await manager.flushAllPendingWhenOnline();
    expect(res.syncedResponses).toBe(60);
    expect(sentBatchSizes.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...sentBatchSizes)).toBeLessThanOrEqual(SYNC_CHUNK_SIZE);
    expect((await manager.getQueueSummary()).pendingResponsesCount).toBe(0);
  });

  it("stops sending further chunks after a rejected request and keeps the rest queued", async () => {
    const storage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new Error("offline");
    });
    const manager = new AndroidOfflineSyncManager({
      storage,
      secureStorage: new MemoryKeyValueAdapter(),
      baseUrl: "http://localhost:3082",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    for (let i = 0; i < 30; i++) {
      await manager.saveAndTrySyncResponse({
        clientSubmissionId: `and_rl_${i}`,
        sourcePlatform: "android",
        isComplete: false,
        currentStep: "S1",
        consent: true,
      });
    }
    fetchMock.mockClear();
    fetchMock.mockImplementation(async () =>
      ({ ok: false, status: 429, json: async () => ({ ok: false }) }) as unknown as Response
    );
    const res = await manager.flushAllPendingWhenOnline();
    expect(res.syncedResponses).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await manager.getQueueSummary()).pendingResponsesCount).toBe(30);
  });
});
