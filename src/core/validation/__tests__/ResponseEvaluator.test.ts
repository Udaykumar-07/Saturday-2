import { ResponseEvaluator } from '../ResponseEvaluator';

describe('ResponseEvaluator', () => {
  const evaluator = new ResponseEvaluator();

  it('should pass valid responses', async () => {
    const result = await evaluator.evaluate('2+2 = **4**', {
      memories: [],
      userInput: 'What is 2+2?',
      expectedType: 'math',
    });

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('should detect repetition', async () => {
    const result = await evaluator.evaluate(
      'Elon Musk Elon Musk Elon Musk is CEO is CEO is CEO',
      {
        memories: [],
        userInput: 'Who is Elon Musk?',
        expectedType: 'factual',
      }
    );

    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('Repeated'))).toBe(true);
  });

  it('should execute in < 10ms', async () => {
    const start = Date.now();
    await evaluator.evaluate('Test response', {
      memories: [],
      userInput: 'Test',
      expectedType: 'conversational',
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });
});
