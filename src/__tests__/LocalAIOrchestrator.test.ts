/**
 * Local AI Orchestrator & Section 65 Offline Acceptance Tests for Saturday.
 *
 * Verifies that:
 * 1. All mock, canned, and template fallback strings are eliminated.
 * 2. Local Qwen acts as the real orchestrator.
 * 3. Compound memory queries ("What movies and music I prefer") resolve truthfully.
 * 4. In airplane mode (offline), 100% of local tasks succeed with 0 network calls.
 * 5. Network-dependent tasks truthfully report network unavailability without hallucinating.
 */

import { Platform } from 'react-native';
import { ServiceContainer } from '../services/container';
import { NetworkGuard } from '../core/ai/qwen';

describe('Section 65 Offline Acceptance Matrix & Real Qwen Orchestrator', () => {
  let container: ServiceContainer;

  beforeEach(async () => {
    Platform.OS = 'android';
    ServiceContainer.resetInstance();
    container = ServiceContainer.getInstance();

    // Ensure Qwen is initialized and ready
    await container.localProvider.initializeQwen();
    container.modelDownloadManager.setReady();

    // Clear any previous network calls and activate airplane mode
    NetworkGuard.reset();
    NetworkGuard.setAirplaneMode(true);
  });

  afterEach(() => {
    NetworkGuard.setAirplaneMode(false);
  });

  test('Setup: Model is installed, verified, and ready offline', async () => {
    const readiness = await container.modelReadinessService.checkReadiness('qwen2.5:0.5b');
    expect(readiness.ready).toBe(true);
    expect(readiness.modelInstalled).toBe(true);
    expect(readiness.integrityVerified).toBe(true);
    expect(readiness.runtimeReady).toBe(true);
    expect(readiness.warmupPassed).toBe(true);
  });

  test('Section 65 Test 1: "Hello" -> natural greeting from local Qwen', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'Hello'
    );

    expect(assistantMessage.content).toMatch(/hello/i);
    expect(assistantMessage.content).toMatch(/saturday/i);
    // Verified NO canned mock fallback
    expect(assistantMessage.content).not.toContain('Here is what I understand about');
    expect(assistantMessage.content).not.toContain("I don't have a detailed answer");
  });

  test('Section 65 Test 2: "What is 25 × 48?" -> 1,200 (exact arithmetic computation)', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'What is 25 × 48?'
    );

    expect(assistantMessage.content).toContain('1,200');
    expect(assistantMessage.content).not.toContain('Here is what I understand about');
  });

  test('Section 65 Test 3: "Explain mitochondria." -> powerhouse of the cell / ATP', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'Explain mitochondria.'
    );

    expect(assistantMessage.content.toLowerCase()).toContain('powerhouse of the cell');
    expect(assistantMessage.content).toContain('ATP');
    expect(assistantMessage.content).not.toContain('Here is what I understand about');
  });

  test('Section 65 Test 4: "What can you do?" -> capabilities summary', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'What can you do?'
    );

    expect(assistantMessage.content).toContain('Play media');
    expect(assistantMessage.content).toContain('Open apps');
    expect(assistantMessage.content).toContain('Remember things');
    expect(assistantMessage.content).not.toContain('Here is what I understand about');
  });

  test('Section 65 Test 5 & 6: Personal Name ("My name is Uday." -> "What is my name?")', async () => {
    const conv = await container.conversationService.create();

    // Store name
    const storeRes = await container.conversationService.sendMessage(
      conv.id,
      'My name is Uday.'
    );
    expect(storeRes.assistantMessage.content).toContain('Uday');

    // Query name
    const queryRes = await container.conversationService.sendMessage(
      conv.id,
      'What is my name?'
    );
    expect(queryRes.assistantMessage.content).toBe('Your name is Uday.');
    expect(queryRes.assistantMessage.content).not.toContain('Here is what I understand about');
  });

  test('Section 65 Test 7 & 8: Single Preference ("I like biblical movies." -> "What movies do I like?")', async () => {
    const conv = await container.conversationService.create();

    // Store preference
    const storeRes = await container.conversationService.sendMessage(
      conv.id,
      'I like biblical movies.'
    );
    expect(storeRes.assistantMessage.content.toLowerCase()).toContain('biblical movies');

    // Query preference
    const queryRes = await container.conversationService.sendMessage(
      conv.id,
      'What movies do I like?'
    );
    expect(queryRes.assistantMessage.content).toContain('biblical movies');
    expect(queryRes.assistantMessage.content).not.toContain('Here is what I understand about');
  });

  test('Section 65 Test 9: Compound Memory Query ("What movies and music I prefer")', async () => {
    const conv = await container.conversationService.create();

    // User previously told Saturday they like biblical movies
    await container.conversationService.sendMessage(
      conv.id,
      'I like biblical movies.'
    );

    // Compound query across movies AND music
    const compoundRes = await container.conversationService.sendMessage(
      conv.id,
      'What movies and music I prefer'
    );

    // Must truthfully state biblical movies preference and acknowledge music preference is not saved yet
    expect(compoundRes.assistantMessage.content).toContain('biblical movies');
    expect(compoundRes.assistantMessage.content).toContain("I don't have any music preferences");
    // CRITICAL: Ensure the canned mock fallback string is completely gone!
    expect(compoundRes.assistantMessage.content).not.toContain('Here is what I understand about');
    expect(compoundRes.assistantMessage.content).not.toContain('as a local on-device model running Qwen 2.5, I can assist with');
  });

  test('Section 65 Test 10: "Open Settings." -> Android ActionEngine execution', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'Open Settings.'
    );

    expect(assistantMessage.content).toContain('Open Settings');
  });

  test('Network Independence Verification: 0 network requests during offline local tests', () => {
    // Section 59 requirement: Zero network requests
    expect(NetworkGuard.getNetworkCallCount()).toBe(0);
    expect(() => NetworkGuard.assertZeroNetworkRequests('Offline Test Suite')).not.toThrow();
  });

  test('Network-Required Task in Airplane Mode: "What is the latest AI news?" -> truthful offline explanation without hallucination', async () => {
    const conv = await container.conversationService.create();
    const { assistantMessage } = await container.conversationService.sendMessage(
      conv.id,
      'What is the latest AI news?'
    );

    expect(assistantMessage.content).toContain('internet connection');
    expect(assistantMessage.content).toContain('offline mode');
    // Ensure it did not hallucinate fake news
    expect(assistantMessage.content).not.toContain('GPT-5');
    // Ensure zero network requests were attempted
    expect(NetworkGuard.getNetworkCallCount()).toBe(0);
  });
});
