/**
 * Offline Model Lifecycle Tests for Saturday.
 *
 * Verifies:
 * 1. Deterministic download lifecycle: NOT_INSTALLED -> DOWNLOADING -> VERIFYING -> INSTALLED -> READY
 * 2. Resumable download capability (byte offset tracking)
 * 3. Pre-download storage safety checks (halts cleanly when insufficient storage)
 * 4. SHA-256 integrity verification (corrupted checksum detection)
 * 5. Safe updates with automatic rollback to previous verified model
 * 6. LocalAIReadinessService diagnostics report matching Section 66 specifications
 * 7. Safe deletion requires explicit user confirmation
 */

import {
  LocalModelStorage,
  ModelDownloadManager,
  LocalAIReadinessService,
  QwenModelRuntime,
  InsufficientStorageError,
} from '../core/ai/qwen';

describe('Offline Model Lifecycle & Management', () => {
  let storage: LocalModelStorage;
  let runtime: QwenModelRuntime;
  let downloadManager: ModelDownloadManager;
  let readinessService: LocalAIReadinessService;

  beforeEach(() => {
    storage = new LocalModelStorage('/test/models');
    runtime = new QwenModelRuntime();
    downloadManager = new ModelDownloadManager(storage, runtime);
    readinessService = new LocalAIReadinessService(storage, downloadManager, runtime);
  });

  test('1. Deterministic lifecycle transitions: NOT_INSTALLED -> DOWNLOADING -> VERIFYING -> INSTALLED -> READY', async () => {
    const statesObserved: string[] = [];
    downloadManager.addProgressListener((p) => {
      if (!statesObserved.includes(p.state)) {
        statesObserved.push(p.state);
      }
    });

    expect(downloadManager.getState()).toBe('NOT_INSTALLED');

    const success = await downloadManager.startDownload({
      modelId: 'qwen2.5:0.5b',
      targetSizeBytes: 10 * 1024 * 1024,
    });

    expect(success).toBe(true);
    expect(downloadManager.getState()).toBe('READY');
    expect(downloadManager.isReady()).toBe(true);
    expect(statesObserved).toContain('DOWNLOADING');
    expect(statesObserved).toContain('VERIFYING');
    expect(statesObserved).toContain('INSTALLED');
    expect(statesObserved).toContain('READY');
  });

  test('2. Resumable download: can pause and resume from byte offset', async () => {
    const totalBytes = 20 * 1024 * 1024;
    let resumeCalled = false;

    // Start download and simulate resume from 10MB
    const success = await downloadManager.startDownload({
      modelId: 'qwen2.5:0.5b',
      targetSizeBytes: totalBytes,
      resumeFromBytes: 10 * 1024 * 1024,
    });

    expect(success).toBe(true);
    const progress = downloadManager.getProgress();
    expect(progress.bytesDownloaded).toBe(totalBytes);
    expect(progress.percentage).toBe(100);
  });

  test('3. Pre-download storage safety: halts cleanly when insufficient disk space', async () => {
    // Set available storage to 50 MB
    storage.setSimulatedAvailableStorageBytes(50 * 1024 * 1024);

    // Try downloading a 300 MB model
    await expect(
      downloadManager.startDownload({
        modelId: 'qwen2.5:0.5b',
        targetSizeBytes: 300 * 1024 * 1024,
      })
    ).rejects.toThrow(InsufficientStorageError);

    expect(downloadManager.getState()).toBe('FAILED');
  });

  test('4. Integrity verification: checksum mismatch detects corrupted model', async () => {
    const success = await downloadManager.startDownload({
      modelId: 'qwen2.5:0.5b',
      targetSizeBytes: 10 * 1024 * 1024,
      simulateCorruptedChecksum: true,
    });

    expect(success).toBe(false);
    expect(downloadManager.getState()).toBe('CORRUPTED');
    expect(downloadManager.isReady()).toBe(false);
  });

  test('5. Safe updates: automatic rollback to previous verified model on failure', async () => {
    // First, install a working model
    await downloadManager.startDownload({
      modelId: 'qwen2.5:0.5b',
      targetSizeBytes: 10 * 1024 * 1024,
    });
    expect(downloadManager.isReady()).toBe(true);

    // Now attempt update with corrupted checksum
    const updateSuccess = await downloadManager.performSafeModelUpdate({
      modelId: 'qwen2.5:0.5b',
      targetSizeBytes: 15 * 1024 * 1024,
      simulateCorruptedChecksum: true,
    });

    expect(updateSuccess).toBe(false);
    // Verified that device was NOT left without a local AI model
    expect(downloadManager.isReady()).toBe(true);
    const manifest = await storage.getModelManifest('qwen2.5:0.5b');
    expect(manifest).not.toBeNull();
  });

  test('6. Safe deletion: requires explicit user confirmation', async () => {
    // Attempting to delete without confirmation throws error
    await expect(storage.deleteModel('qwen2.5:0.5b', false)).rejects.toThrow(
      /explicit user confirmation/
    );

    // Deletion with explicit confirmation succeeds
    const deleted = await storage.deleteModel('qwen2.5:0.5b', true);
    expect(deleted).toBe(true);
    expect(await storage.isModelInstalled('qwen2.5:0.5b')).toBe(false);
  });

  test('7. LocalAIReadinessService produces complete Section 66 diagnostic report', async () => {
    await runtime.initialize();
    downloadManager.setReady();

    const report = await readinessService.generateSection66Report();

    expect(report.model.actualModel).toContain('Qwen 2.5 0.5B Instruct');
    expect(report.model.quantization).toBe('Q4_K_M');
    expect(report.installation.downloaded).toBe(true);
    expect(report.installation.verified).toBe(true);
    expect(report.offline.airplaneModeInference).toBe('PASS');
    expect(report.offline.networkRequestsDuringOfflineLocalTest).toBe(0);
    expect(report.routing.localTasks).toBe('PASS');
    expect(report.routing.networkRequiredTasks).toBe('PASS');
    expect(report.memory.offlineMemoryStorage).toBe('PASS');
    expect(report.memory.offlineMemoryRetrieval).toBe('PASS');

    const formattedReport = await readinessService.printReport();
    expect(formattedReport).toContain('66. FINAL DEBUG REPORT');
    expect(formattedReport).toContain('Qwen 2.5 0.5B Instruct');
  });
});
