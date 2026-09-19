/**
 * Regression test for SATURDAY CRITICAL FIX:
 * Verifies that the generic Qwen fallback response does NOT override real local AI.
 * 
 * This test ensures:
 * 1. The generic response "I'm running locally via Qwen on your device..." is NOT used
 * 2. Real Qwen inference is executed for all user queries
 * 3. Memory retrieval works correctly
 * 4. Pattern matching provides intelligent responses
 */

import { QwenModelRuntime } from '../src/core/ai/qwen/QwenModelRuntime';
import { QwenContextBuilder } from '../src/core/ai/qwen/QwenContextBuilder';
import { Memory } from '../src/types/memory';

describe('Qwen Fallback Response Fix', () => {
  let runtime: QwenModelRuntime;

  beforeAll(async () => {
    runtime = new QwenModelRuntime();
    await runtime.initialize();
  });

  const FORBIDDEN_RESPONSE = "I'm running locally via Qwen on your device. How can I assist you with your request?";

  test('CRITICAL: Generic fallback response must NOT appear for "What music I\'ll listen to"', async () => {
    const result = await runtime.infer("What music I'll listen to");
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).not.toContain("I'm running locally via Qwen on your device");
  });

  test('CRITICAL: Generic fallback response must NOT appear for "Who is MJ"', async () => {
    const result = await runtime.infer('Who is MJ');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).not.toContain("I'm running locally via Qwen on your device");
  });

  test('CRITICAL: Generic fallback response must NOT appear for "Hello"', async () => {
    const result = await runtime.infer('Hello');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).not.toContain("How can I assist you with your request?");
  });

  test('CRITICAL: Generic fallback response must NOT appear for "What is 2 + 2"', async () => {
    const result = await runtime.infer('What is 2 + 2');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).toBe('4');
  });

  test('Memory retrieval: "What is my name?" with stored name', async () => {
    const memories: Memory[] = [
      {
        id: 'mem_1',
        key: 'user.name',
        value: 'uday',
        category: 'personal',
        timestamp: Date.now(),
      },
    ];

    const context = QwenContextBuilder.buildPrompt(
      [{ role: 'user', content: 'What is my name' }],
      { memories }
    );

    const result = await runtime.infer(context.fullPrompt);
    expect(result.text.toLowerCase()).toContain('uday');
  });

  test('Music preference query without stored preference', async () => {
    const result = await runtime.infer("What music I'll listen to");
    expect(result.text).toContain("don't have your music preferences");
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
  });

  test('Movie preference query with stored preference', async () => {
    const memories: Memory[] = [
      {
        id: 'mem_2',
        key: 'preference.movies',
        value: 'biblical movies',
        category: 'preference',
        timestamp: Date.now(),
      },
    ];

    const context = QwenContextBuilder.buildPrompt(
      [{ role: 'user', content: 'What movies do I like' }],
      { memories }
    );

    const result = await runtime.infer(context.fullPrompt);
    expect(result.text.toLowerCase()).toContain('biblical');
  });

  test('"Who is MJ?" should ask for clarification, not use generic fallback', async () => {
    const result = await runtime.infer('Who is MJ?');
    expect(result.text).toContain('could refer');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
  });

  test('Math: 25 × 48 should return 1,200', async () => {
    const result = await runtime.infer('What is 25 × 48');
    expect(result.text).toBe('1,200');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
  });

  test('Greeting should not use generic fallback', async () => {
    const result = await runtime.infer('Hello');
    expect(result.text).toContain('Saturday');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
  });

  test('Greeting with stored name should personalize', async () => {
    const memories: Memory[] = [
      {
        id: 'mem_3',
        key: 'user.name',
        value: 'Uday',
        category: 'personal',
        timestamp: Date.now(),
      },
    ];

    const context = QwenContextBuilder.buildPrompt(
      [{ role: 'user', content: 'Hello' }],
      { memories }
    );

    const result = await runtime.infer(context.fullPrompt);
    expect(result.text).toContain('Uday');
  });

  test('"How are you?" should provide natural response', async () => {
    const result = await runtime.infer('How are you?');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).toContain('functioning');
  });

  test('"Tell me a joke" should provide actual joke', async () => {
    const result = await runtime.infer('Tell me a joke');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text.length).toBeGreaterThan(20);
  });

  test('Contextual reference: "What about movies?" with biblical preference', async () => {
    const memories: Memory[] = [
      {
        id: 'mem_4',
        key: 'preference.movies',
        value: 'biblical movies',
        category: 'preference',
        timestamp: Date.now(),
      },
    ];

    const context = QwenContextBuilder.buildPrompt(
      [{ role: 'user', content: 'What about movies?' }],
      { memories }
    );

    const result = await runtime.infer(context.fullPrompt);
    expect(result.text.toLowerCase()).toContain('biblical');
  });

  test('Unknown question should acknowledge limitation, not use generic intro', async () => {
    const result = await runtime.infer('What is the meaning of life?');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
    expect(result.text).not.toContain("I'm running locally via Qwen on your device");
  });

  test('Very short input should get helpful response', async () => {
    const result = await runtime.infer('help');
    expect(result.text).not.toBe(FORBIDDEN_RESPONSE);
  });
});
