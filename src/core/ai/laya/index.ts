/**
 * Laya AI on-device integration.
 *
 * Laya is an open-source System-1 decision model (Convai Innovations)
 * used for ML-powered intent classification in Saturday.
 *
 * Runs entirely on-device via ONNX Runtime after a one-time model download.
 * No internet required for classification after installation.
 */

export { LayaRuntime } from './LayaRuntime';
export type { OnnxSession, LayaRuntimeState } from './LayaRuntime';
export { LayaModelManager } from './LayaModelManager';
export type { LayaDownloadState, LayaDownloadProgress } from './LayaModelManager';
export { LayaIntentClassifier } from './LayaIntentClassifier';
export type { LayaClassificationResult } from './LayaIntentClassifier';
export { LayaTokenizer } from './LayaTokenizer';
export { createOnnxSession } from './LayaOnnxBridge';
export type {
  Question,
  ChoiceQuestion,
  ScoreQuestion,
  NoulQuestion,
  Answer,
  ChoiceAnswer,
  ScoreAnswer,
  NoulAnswer,
  LayaModelConfig,
  SystemOneResult,
} from './LayaTypes';
export {
  buildSequence,
  softmax,
  confidenceFromProbs,
  tempBucket,
  QTYPES,
} from './LayaSequence';
