/**
 * Laya AI type definitions.
 * Ported from receptron/laya types.ts — follows the Jev system_one API shape.
 * Apache 2.0 licensed, original by Convai Innovations.
 */

export type QuestionType = 'choice' | 'score' | 'noul';

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string | object;
  /** option -> short description (or null), or a plain list of option names */
  criteria: Record<string, string | null> | string[];
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string | object;
  /** ordered levels, index 0 = lowest */
  criteria: string[];
}

export interface NoulQuestion {
  type: 'noul';
  instructions: string | object;
  criteria?: { true?: string; false?: string };
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  /** 1 - normalized entropy of the answer distribution */
  confidence: number;
}

export interface ScoreAnswer {
  type: 'score';
  /** expected level (0 .. levels-1) */
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface NoulAnswer {
  type: 'noul';
  /** P(true) */
  noul: number;
  confidence: number;
}

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type AnswerFor<Q extends Question> = Q extends ChoiceQuestion
  ? ChoiceAnswer
  : Q extends ScoreQuestion
    ? ScoreAnswer
    : NoulAnswer;

export interface SystemOneResult<Q extends Record<string, Question>> {
  model: string;
  answers: { [K in keyof Q]: AnswerFor<Q[K]> };
  usage: { input_tokens: number; output_tokens: number };
}

/** laya_config.json / rl_agent_config.json, written by export_onnx.py */
export interface LayaModelConfig {
  max_len: number;
  head_max_len: number;
  temperature: [number, number, number];
  temperature_by_options: Record<string, number>;
}
