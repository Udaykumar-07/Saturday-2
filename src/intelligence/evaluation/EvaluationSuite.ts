/**
 * Evaluation Suite Definitions for Saturday Evaluation System.
 */

import {
  EvaluationSuiteDefinition,
  EvaluationTask,
} from '../../core/types/intelligence';

export const BUILT_IN_EVALUATION_SUITES: EvaluationSuiteDefinition[] = [
  {
    id: 'reasoning-basic',
    name: 'Basic Reasoning & Mathematics',
    category: 'REASONING',
    budget: 'light',
    tasks: [
      {
        id: 'math-arithmetic',
        category: 'REASONING',
        input: 'Calculate 25 * 4 + 15',
        expectedBehavior: 'Output 115',
        evaluationCriteria: 'Output must contain the exact number 115.',
      },
      {
        id: 'logic-deduction',
        category: 'REASONING',
        input: 'If all bloops are razzies and all razzies are lazzies, are all bloops definitely lazzies? Answer yes or no and explain briefly.',
        expectedBehavior: 'Affirmative response (yes) based on transitive logic.',
        evaluationCriteria: 'Output must state yes or affirmative.',
      },
    ],
  },
  {
    id: 'coding-basic',
    name: 'Basic Code Generation',
    category: 'CODING',
    budget: 'light',
    tasks: [
      {
        id: 'code-reverse-string',
        category: 'CODING',
        input: 'Write a TypeScript function to reverse a string.',
        expectedBehavior: 'Valid TypeScript function reversing a string.',
        evaluationCriteria: 'Contains valid syntax and string reversal logic.',
      },
    ],
  },
  {
    id: 'summarization-basic',
    name: 'Summarization Quality',
    category: 'SUMMARIZATION',
    budget: 'light',
    tasks: [
      {
        id: 'summary-concise',
        category: 'SUMMARIZATION',
        input: 'Summarize the core premise of personal local AI in one sentence.',
        expectedBehavior: 'A single concise sentence highlighting privacy, on-device execution, and user control.',
        evaluationCriteria: 'Under 50 words, covers on-device privacy.',
      },
    ],
  },
  {
    id: 'tools-basic',
    name: 'Tool & Action Selection',
    category: 'TOOL_USE',
    budget: 'light',
    tasks: [
      {
        id: 'tool-intent-dispatch',
        category: 'TOOL_USE',
        input: 'Open YouTube and play Imagine Dragons',
        expectedBehavior: 'Correctly identifies app.launch and media.play capabilities.',
        evaluationCriteria: 'Identifies media playback or app opening.',
      },
    ],
  },
];
