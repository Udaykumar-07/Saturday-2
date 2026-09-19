/**
 * Debug script to trace Qwen inference flow and verify no generic fallback.
 * 
 * Usage: npx ts-node scripts/debug-qwen-inference.ts
 */

import { QwenModelRuntime } from '../src/core/ai/qwen/QwenModelRuntime';
import { QwenContextBuilder } from '../src/core/ai/qwen/QwenContextBuilder';
import { Memory } from '../src/types/memory';

const FORBIDDEN_RESPONSE = "I'm running locally via Qwen on your device. How can I assist you with your request?";

interface TestCase {
  name: string;
  input: string;
  memories?: Memory[];
  expectedToContain?: string;
  expectedNotToContain?: string;
}

const testCases: TestCase[] = [
  {
    name: 'Name Query',
    input: 'What is my name',
    memories: [
      {
        id: 'mem_name',
        key: 'user.name',
        value: 'uday',
        category: 'personal',
        timestamp: Date.now(),
      },
    ],
    expectedToContain: 'uday',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Music Preference (No Data)',
    input: "What music I'll listen to",
    expectedToContain: "don't have",
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Who is MJ',
    input: 'Who is MJ',
    expectedToContain: 'could refer',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Hello Greeting',
    input: 'Hello',
    expectedToContain: 'Saturday',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Math: 2 + 2',
    input: 'What is 2 + 2',
    expectedToContain: '4',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Math: 25 × 48',
    input: 'What is 25 × 48',
    expectedToContain: '1,200',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Movie Preference',
    input: 'What movies do I like',
    memories: [
      {
        id: 'mem_movies',
        key: 'preference.movies',
        value: 'biblical movies',
        category: 'preference',
        timestamp: Date.now(),
      },
    ],
    expectedToContain: 'biblical',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'How are you',
    input: 'How are you?',
    expectedToContain: 'functioning',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
  {
    name: 'Tell me a joke',
    input: 'Tell me a joke',
    expectedNotToContain: FORBIDDEN_RESPONSE,
  },
];

async function runDebugTests() {
  console.log('==================================================');
  console.log('QWEN INFERENCE DEBUG TRACE');
  console.log('==================================================\n');

  const runtime = new QwenModelRuntime();
  
  console.log('Initializing Qwen runtime...');
  await runtime.initialize();
  const status = runtime.getStatus();
  console.log(`Runtime state: ${status.state}`);
  console.log(`Model loaded: ${status.loaded}`);
  console.log(`Model ID: ${status.modelId}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`--------------------------------------------------`);
    console.log(`Input: "${testCase.input}"`);

    let prompt = testCase.input;
    if (testCase.memories && testCase.memories.length > 0) {
      const context = QwenContextBuilder.buildPrompt(
        [{ role: 'user', content: testCase.input }],
        { memories: testCase.memories }
      );
      prompt = context.fullPrompt;
      console.log(`Memories provided: ${testCase.memories.length}`);
    }

    const startTime = Date.now();
    const result = await runtime.infer(prompt);
    const latencyMs = Date.now() - startTime;

    console.log(`\nOutput: "${result.text}"`);
    console.log(`Latency: ${latencyMs}ms`);
    console.log(`Tokens: ${result.outputTokenCount}`);
    console.log(`Tokens/sec: ${result.tokensPerSec}`);

    // Validation
    let testPassed = true;
    const errors: string[] = [];

    if (result.text === FORBIDDEN_RESPONSE) {
      testPassed = false;
      errors.push('❌ CRITICAL: Generic fallback response detected!');
    }

    if (testCase.expectedToContain && !result.text.toLowerCase().includes(testCase.expectedToContain.toLowerCase())) {
      testPassed = false;
      errors.push(`❌ Expected to contain "${testCase.expectedToContain}"`);
    }

    if (testCase.expectedNotToContain && result.text.includes(testCase.expectedNotToContain)) {
      testPassed = false;
      errors.push(`❌ Should NOT contain "${testCase.expectedNotToContain}"`);
    }

    if (testPassed) {
      console.log('\n✓ PASS');
      passed++;
    } else {
      console.log('\n✗ FAIL');
      errors.forEach((err) => console.log(`  ${err}`));
      failed++;
    }
  }

  console.log('\n==================================================');
  console.log('SUMMARY');
  console.log('==================================================');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
  }
}

runDebugTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
