/**
 * Reflexion Integration Tests
 * Tests the complete Reflexion loop: Actor → Evaluator → Self-Reflection
 */

import { ResponseEvaluator, EvaluationContext } from '../../core/validation/ResponseEvaluator';
import { ReflectionGenerator } from '../../core/reflection/ReflectionGenerator';
import { EpisodicMemoryStore } from '../../core/memory/EpisodicMemoryStore';
import { ToolRegistry, MathTool, DateTimeTool } from '../../core/tools/ToolRegistry';

describe('Reflexion Framework Integration', () => {
  describe('ResponseEvaluator - Speed Tests', () => {
    const evaluator = new ResponseEvaluator();

    it('should evaluate responses in < 10ms', async () => {
      const context: EvaluationContext = {
        memories: [],
        userInput: 'What is 2+2?',
        expectedType: 'math',
      };

      const start = Date.now();
      const result = await evaluator.evaluate('2+2 = **4**', context);
      const elapsed = Date.now() - start;

      expect(result.passed).toBe(true);
      expect(elapsed).toBeLessThan(10);
    });

    it('should detect repetition hallucination', async () => {
      const context: EvaluationContext = {
        memories: [],
        userInput: 'Who is Elon Musk?',
        expectedType: 'factual',
      };

      const badResponse = 'Elon Musk Elon Musk Elon Musk is CEO is CEO is CEO';
      
      const result = await evaluator.evaluate(badResponse, context);

      expect(result.passed).toBe(false);
      expect(result.failureReasons.some(r => r.includes('Repeated phrase'))).toBe(true);
    });

    it('should detect nonsense patterns', async () => {
      const context: EvaluationContext = {
        memories: [],
        userInput: 'What is AI?',
        expectedType: 'factual',
      };

      const badResponse = 'a';
      
      const result = await evaluator.evaluate(badResponse, context);

      expect(result.passed).toBe(false);
      expect(result.failureReasons.some(r => r.includes('too short'))).toBe(true);
    });
  });

  describe('ReflectionGenerator - Speed Tests', () => {
    const generator = new ReflectionGenerator();

    it('should generate reflection in < 5ms', () => {
      const context = {
        userInput: 'What is 3x5+5+8?',
        response: '3x5+5+8 = **23**', // Wrong! Should be 28
        evaluation: {
          passed: false,
          score: 0.0,
          failureReasons: ['Math result incorrect'],
          confidence: 1.0,
        },
        attemptNumber: 1,
      };

      const start = Date.now();
      const reflection = generator.generateReflection(context);
      const elapsed = Date.now() - start;

      expect(reflection.verbalReflection).toBeDefined();
      expect(reflection.actionableHints.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(5);
    });

    it('should extract actionable hints from repetition failure', () => {
      const context = {
        userInput: 'Who is Elon Musk?',
        response: 'Elon Musk Elon Musk is CEO is CEO',
        evaluation: {
          passed: false,
          score: 0.3,
          failureReasons: ['Repeated phrase "elon musk" 3 times'],
          confidence: 0.95,
        },
        attemptNumber: 1,
      };

      const reflection = generator.generateReflection(context);

      expect(reflection.actionableHints).toContain('Avoid repeating the same phrases');
      expect(reflection.actionableHints).toContain('Check knowledge base before answering');
    });
  });

  describe('EpisodicMemoryStore - Speed Tests', () => {
    const store = new EpisodicMemoryStore();

    beforeEach(async () => {
      await store.clear();
    });

    it('should store and retrieve reflections instantly', async () => {
      const reflection = {
        id: 'refl_test_1',
        timestamp: Date.now(),
        userQuery: 'What is 2+2?',
        failedResponse: '2+2 = **5**',
        evaluation: {
          passed: false,
          score: 0.0,
          failureReasons: ['Math incorrect'],
          confidence: 1.0,
        },
        verbalReflection: 'Failed because: Wrong answer',
        actionableHints: ['Use calculator'],
        queryPattern: 'math_expression',
      };

      const storeStart = Date.now();
      await store.storeReflection(reflection);
      const storeElapsed = Date.now() - storeStart;

      const retrieveStart = Date.now();
      const retrieved = await store.retrieveRelevantReflections('What is 3+3?', 'math_expression');
      const retrieveElapsed = Date.now() - retrieveStart;

      expect(retrieved.length).toBe(1);
      expect(retrieved[0].id).toBe('refl_test_1');
      expect(storeElapsed).toBeLessThan(5);
      expect(retrieveElapsed).toBeLessThan(5);
    });

    it('should prune old reflections (keep last 3)', async () => {
      for (let i = 0; i < 5; i++) {
        await store.storeReflection({
          id: `refl_${i}`,
          timestamp: Date.now() + i,
          userQuery: `Query ${i}`,
          failedResponse: `Response ${i}`,
          evaluation: { passed: false, score: 0.0, failureReasons: [], confidence: 1.0 },
          verbalReflection: `Reflection ${i}`,
          actionableHints: [],
          queryPattern: 'math_expression',
        });
      }

      const retrieved = await store.retrieveRelevantReflections('', 'math_expression');
      
      expect(retrieved.length).toBe(3);
      expect(retrieved[0].id).toBe('refl_4'); // Most recent first
      expect(retrieved[2].id).toBe('refl_2'); // Oldest kept
    });
  });

  describe('ToolRegistry - Deterministic Fast Path', () => {
    const registry = new ToolRegistry();

    it('should handle math queries in < 1ms', async () => {
      const start = Date.now();
      const result = await registry.tryExecute('What is 2+2?');
      const elapsed = Date.now() - start;

      expect(result).not.toBeNull();
      expect(result?.result).toContain('**4**');
      expect(elapsed).toBeLessThan(1);
    });

    it('should handle complex math with correct order of operations', async () => {
      const result = await registry.tryExecute('3x5+5+8');
      
      expect(result).not.toBeNull();
      expect(result?.result).toContain('**28**');
      expect(result?.evaluation.passed).toBe(true);
    });

    it('should handle datetime queries in < 1ms', async () => {
      const start = Date.now();
      const result = await registry.tryExecute('What time is it?');
      const elapsed = Date.now() - start;

      expect(result).not.toBeNull();
      expect(result?.result).toMatch(/\d{1,2}:\d{2}/); // Contains time
      expect(elapsed).toBeLessThan(1);
    });

    it('should handle memory queries with context', async () => {
      const memories = [
        { key: 'user.name', value: 'John' },
      ];

      const result = await registry.tryExecute("What's my name?", { memories });

      expect(result).not.toBeNull();
      expect(result?.result).toContain('John');
      expect(result?.evaluation.passed).toBe(true);
    });

    it('should return null for non-deterministic queries', async () => {
      const result = await registry.tryExecute('Tell me about quantum computing');

      expect(result).toBeNull(); // Should fall through to LLM
    });
  });

  describe('Reflexion Loop - Integration', () => {
    it('should improve on second trial with reflection', async () => {
      const evaluator = new ResponseEvaluator();
      const generator = new ReflectionGenerator();
      const memory = new EpisodicMemoryStore();

      // Trial 1: Bad response
      const trial1Response = 'Elon Musk Elon Musk is CEO is CEO'; // Repetitive
      const trial1Context: EvaluationContext = {
        memories: [],
        userInput: 'Who is Elon Musk?',
        expectedType: 'factual',
      };

      const trial1Eval = await evaluator.evaluate(trial1Response, trial1Context);
      expect(trial1Eval.passed).toBe(false);

      // Generate reflection
      const reflection = generator.generateReflection({
        userInput: 'Who is Elon Musk?',
        response: trial1Response,
        evaluation: trial1Eval,
        attemptNumber: 1,
      });

      await memory.storeReflection(reflection);

      // Trial 2: Good response (simulated with hints applied)
      const trial2Response = 'Elon Musk is the CEO of Tesla and SpaceX.'; // No repetition
      const trial2Eval = await evaluator.evaluate(trial2Response, trial1Context);

      expect(trial2Eval.passed).toBe(true);
      expect(trial2Eval.score).toBeGreaterThan(0.7);
    });
  });
});
