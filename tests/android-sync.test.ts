import { describe, it, expect, vi } from "vitest";
import {
  AndroidOfflineSyncManager,
  MemoryKeyValueAdapter,
} from "../android-app/src/sync/offlineStore";

describe("Android Offline Store & Automatic Online Sync Engine (Phase 2 - S1, S2, S3, S4)", () => {
  it("stores step-by-step partial survey progress offline using the same clientSubmissionId and flushes automatically when online", async () => {
    const storage = new MemoryKeyValueAdapter();
    const fetchMock = vi.fn();

    const manager = new AndroidOfflineSyncManager({
      storage,
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
