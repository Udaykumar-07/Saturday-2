/**
 * Quick Reflexion Verification Script
 * Tests core components without full Jest setup
 */

import { ResponseEvaluator } from './src/core/validation/ResponseEvaluator.ts';
import { ReflectionGenerator } from './src/core/reflection/ReflectionGenerator.ts';
import { EpisodicMemoryStore } from './src/core/memory/EpisodicMemoryStore.ts';
import { ToolRegistry } from './src/core/tools/ToolRegistry.ts';

console.log('🚀 Saturday AI - Reflexion Verification\n');

// Test 1: ResponseEvaluator Speed
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 1: ResponseEvaluator Performance');
const evaluator = new ResponseEvaluator();
const start1 = Date.now();
const result1 = await evaluator.evaluate('2+2 = **4**', {
  memories: [],
  userInput: 'What is 2+2?',
  expectedType: 'math',
});
const elapsed1 = Date.now() - start1;
console.log(`✅ Evaluation completed in ${elapsed1}ms`);
console.log(`   Passed: ${result1.passed}, Score: ${result1.score.toFixed(2)}`);
console.log(`   ${elapsed1 < 10 ? '✅ FAST' : '❌ SLOW'} (target: < 10ms)\n`);

// Test 2: ReflectionGenerator Speed
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 2: ReflectionGenerator Performance');
const generator = new ReflectionGenerator();
const start2 = Date.now();
const reflection = generator.generateReflection({
  userInput: 'What is 2+2?',
  response: '2+2 = **5**',
  evaluation: {
    passed: false,
    score: 0.0,
    failureReasons: ['Math incorrect'],
    confidence: 1.0,
  },
  attemptNumber: 1,
});
const elapsed2 = Date.now() - start2;
console.log(`✅ Reflection generated in ${elapsed2}ms`);
console.log(`   Hints: ${reflection.actionableHints.length}`);
console.log(`   ${elapsed2 < 5 ? '✅ FAST' : '❌ SLOW'} (target: < 5ms)\n`);

// Test 3: EpisodicMemoryStore Speed
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 3: EpisodicMemoryStore Performance');
const memory = new EpisodicMemoryStore();
const start3 = Date.now();
await memory.storeReflection(reflection);
const elapsed3a = Date.now() - start3;
const start3b = Date.now();
const retrieved = await memory.retrieveRelevantReflections('What is 3+3?', 'math_expression');
const elapsed3b = Date.now() - start3b;
console.log(`✅ Store: ${elapsed3a}ms, Retrieve: ${elapsed3b}ms`);
console.log(`   Retrieved: ${retrieved.length} reflection(s)`);
console.log(`   ${elapsed3a < 5 && elapsed3b < 5 ? '✅ FAST' : '❌ SLOW'} (target: < 5ms each)\n`);

// Test 4: ToolRegistry - Math
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 4: MathTool Accuracy & Speed');
const tools = new ToolRegistry();
const start4 = Date.now();
const mathResult = await tools.tryExecute('What is 3x5+5+8?');
const elapsed4 = Date.now() - start4;
console.log(`✅ Execution completed in ${elapsed4}ms`);
console.log(`   Result: ${mathResult?.result || 'null'}`);
console.log(`   Correct: ${mathResult?.result.includes('**28**') ? '✅ YES' : '❌ NO'}`);
console.log(`   ${elapsed4 < 1 ? '✅ ULTRA FAST' : elapsed4 < 10 ? '✅ FAST' : '❌ SLOW'} (target: < 1ms)\n`);

// Test 5: ToolRegistry - DateTime
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 5: DateTimeTool Speed');
const start5 = Date.now();
const timeResult = await tools.tryExecute('What time is it?');
const elapsed5 = Date.now() - start5;
console.log(`✅ Execution completed in ${elapsed5}ms`);
console.log(`   Has time: ${/\d{1,2}:\d{2}/.test(timeResult?.result || '') ? '✅ YES' : '❌ NO'}`);
console.log(`   ${elapsed5 < 1 ? '✅ ULTRA FAST' : elapsed5 < 10 ? '✅ FAST' : '❌ SLOW'} (target: < 1ms)\n`);

// Test 6: Hallucination Detection
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 6: Hallucination Detection');
const badResponse = 'Elon Musk Elon Musk Elon Musk is CEO is CEO is CEO';
const hallTest = await evaluator.evaluate(badResponse, {
  memories: [],
  userInput: 'Who is Elon Musk?',
  expectedType: 'factual',
});
console.log(`✅ Detected repetition: ${hallTest.failureReasons.some(r => r.includes('Repeated')) ? '✅ YES' : '❌ NO'}`);
console.log(`   Failed correctly: ${!hallTest.passed ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${hallTest.score.toFixed(2)} (should be low)\n`);

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUMMARY\n');

const allPassed = 
  result1.passed &&
  elapsed1 < 10 &&
  elapsed2 < 5 &&
  elapsed3a < 5 &&
  elapsed3b < 5 &&
  elapsed4 < 10 &&
  elapsed5 < 10 &&
  mathResult?.result.includes('**28**') &&
  !hallTest.passed;

if (allPassed) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('🚀 Reflexion system is ready for production!\n');
  console.log('Performance Summary:');
  console.log(`  - Evaluation: ${elapsed1}ms (< 10ms ✅)`);
  console.log(`  - Reflection: ${elapsed2}ms (< 5ms ✅)`);
  console.log(`  - Memory ops: ${elapsed3a}ms + ${elapsed3b}ms (< 5ms ✅)`);
  console.log(`  - Math tool: ${elapsed4}ms (< 1ms ${elapsed4 < 1 ? '✅' : '⚠️'})`);
  console.log(`  - DateTime tool: ${elapsed5}ms (< 1ms ${elapsed5 < 1 ? '✅' : '⚠️'})`);
  console.log(`  - Hallucination detection: ✅`);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Review the output above for details.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
