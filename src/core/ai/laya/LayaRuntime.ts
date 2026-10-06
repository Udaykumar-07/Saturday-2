/**
 * Laya ONNX Runtime wrapper for React Native.
 *
 * Replaces the Node.js onnxruntime-node with onnxruntime-react-native.
 * Manages the ONNX InferenceSession lifecycle and handles the
 * 5-tensor input / 2-tensor output contract of the Laya model.
 *
 * Input tensors:
 *   - input_ids (int64): tokenized sequence
 *   - attention_mask (int64): 1 for real tokens, 0 for padding
 *   - marker_pos (int64): positions of [MASK] markers
 *   - marker_mask (bool): which markers are active
 *   - qtype (int64): question type code per batch item
 *
 * Output tensors:
 *   - logits (float32): raw logits per option
 *   - act_probs (float32): action probabilities
 */

import {
  buildSequence,
  confidenceFromProbs,
  QTYPES,
  renderOptions,
  softmax,
  tempBucket,
  toInternal,
  type Encode,
  type SpecialIds,
} from './LayaSequence';
import type {
  Answer,
  ChoiceAnswer,
  LayaModelConfig,
  NoulAnswer,
  Question,
  ScoreAnswer,
  SystemOneResult,
} from './LayaTypes';
import type { LayaTokenizer } from './LayaTokenizer';

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/**
 * Abstraction over the ONNX InferenceSession to support both
 * onnxruntime-react-native and mocking for tests.
 */
export interface OnnxSession {
  run(feeds: Record<string, { type: string; data: ArrayLike<number>; dims: number[] }>): Promise<{
    logits?: { data: Float32Array; dims: number[] };
    act_probs?: { data: Float32Array; dims: number[] };
  }>;
  release?(): Promise<void>;
}

export type LayaRuntimeState = 'NOT_LOADED' | 'LOADING' | 'READY' | 'ERROR';

export class LayaRuntime {
  private session: OnnxSession | null = null;
  private tokenizer: LayaTokenizer | null = null;
  private config: LayaModelConfig | null = null;
  private specialIds: SpecialIds | null = null;
  private _state: LayaRuntimeState = 'NOT_LOADED';
  private _error: string | null = null;

  get state(): LayaRuntimeState {
    return this._state;
  }

  get error(): string | null {
    return this._error;
  }

  get isReady(): boolean {
    return this._state === 'READY';
  }

  /**
   * Initialize the runtime with pre-loaded components.
   * This is called after the model manager has downloaded and loaded everything.
   */
  initialize(
    session: OnnxSession,
    tokenizer: LayaTokenizer,
    config: LayaModelConfig,
  ): void {
    this.session = session;
    this.tokenizer = tokenizer;
    this.config = config;

    // Resolve special token IDs
    const id = (t: string): number => {
      const v = tokenizer.tokenToId(t);
      if (v === undefined) throw new Error(`Laya: special token ${t} missing from vocabulary`);
      return v;
    };

    this.specialIds = {
      cls: id('[CLS]'),
      sep: id('[SEP]'),
      mask: id('[MASK]'),
      pad: id('[PAD]'),
      maskTok: '[MASK]',
    };

    this._state = 'READY';
    this._error = null;
    console.log('[Laya] Runtime initialized and ready');
  }

  /**
   * Set error state.
   */
  setError(error: string): void {
    this._state = 'ERROR';
    this._error = error;
  }

  /**
   * Set loading state.
   */
  setLoading(): void {
    this._state = 'LOADING';
  }

  /**
   * Run System-1 decision: answer every question about `state` in one forward pass.
   * Faithful port of Laya.systemOne() adapted for React Native.
   */
  async systemOne<Q extends Record<string, Question>>(
    state: unknown,
    questions: Q,
  ): Promise<SystemOneResult<Q>> {
    if (!this.isReady || !this.session || !this.tokenizer || !this.config || !this.specialIds) {
      throw new Error('Laya runtime is not initialized. Call initialize() first.');
    }

    const qids = Object.keys(questions);
    if (qids.length === 0) {
      throw new Error('systemOne: at least one question is required');
    }

    const encode: Encode = (text: string) => this.tokenizer!.encode(text);

    // Build sequences for each question
    const items = qids.map((qid) => {
      const q = toInternal(questions[qid] as Question);
      const { ids, markers } = buildSequence(
        encode,
        this.specialIds!,
        state,
        q,
        this.config!.max_len,
        this.config!.head_max_len,
      );
      if (markers.length !== renderOptions(q).length) {
        throw new Error(
          `question ${JSON.stringify(qid)}: options do not fit in head_max_len=${this.config!.head_max_len} tokens`,
        );
      }
      return { q, ids, markers, qtype: QTYPES[q.t] };
    });

    // Collate: right-pad to longest sequence / widest option set
    const n = items.length;
    const L = Math.max(...items.map((it) => it.ids.length));
    const K = Math.max(...items.map((it) => it.markers.length));

    // Use Float64Array for int64 compatibility across platforms
    const inputIds = new Float64Array(n * L).fill(this.specialIds.pad);
    const attention = new Float64Array(n * L);
    const markerPos = new Float64Array(n * K);
    const markerMask = new Float64Array(n * K);
    const qtype = new Float64Array(n);
    let nTokens = 0;

    items.forEach((it, i) => {
      it.ids.forEach((v, j) => {
        inputIds[i * L + j] = v;
        attention[i * L + j] = 1;
      });
      nTokens += it.ids.length;
      it.markers.forEach((m, j) => {
        markerPos[i * K + j] = m;
        markerMask[i * K + j] = 1;
      });
      qtype[i] = it.qtype;
    });

    // Run ONNX inference
    const startMs = Date.now();
    const out = await this.session.run({
      input_ids: { type: 'int64', data: inputIds, dims: [n, L] },
      attention_mask: { type: 'int64', data: attention, dims: [n, L] },
      marker_pos: { type: 'int64', data: markerPos, dims: [n, K] },
      marker_mask: { type: 'bool', data: markerMask, dims: [n, K] },
      qtype: { type: 'int64', data: qtype, dims: [n] },
    });
    const inferenceMs = Date.now() - startMs;
    console.log(`[Laya] Inference completed in ${inferenceMs}ms`);

    const logits = out.logits?.data;
    const act = out.act_probs;
    if (!logits || !(logits instanceof Float32Array)) {
      throw new Error('Laya: unexpected model output (expected float32 logits)');
    }
    const actData = act?.data;
    const nAct = act?.dims[1] ?? 1;

    // Post-process: apply temperature, softmax, extract answers
    const answers: Record<string, Answer> = {};
    items.forEach((it, r) => {
      const qid = qids[r] as string;
      const k = it.markers.length;
      const temp =
        this.config!.temperature_by_options[tempBucket(it.qtype, k)] ??
        this.config!.temperature[it.qtype] ??
        1;
      const raw = Array.from(logits.subarray(r * K, r * K + k), (v) => v / temp);
      const p = softmax(raw);
      const q = it.q;

      if (q.t === 'choice') {
        const keys = Object.keys(q.crit as Record<string, string | null>);
        const best = p.indexOf(Math.max(...p));
        const answer: ChoiceAnswer = {
          type: 'choice',
          choice: keys[best] as string,
          probabilities: Object.fromEntries(keys.map((kk, i) => [kk, round4(p[i] ?? 0)])),
          confidence: round4(confidenceFromProbs(p)),
        };
        answers[qid] = answer;
      } else if (q.t === 'score') {
        const crit = q.crit as string[];
        const answer: ScoreAnswer = {
          type: 'score',
          score: round4(p.reduce((s, v, i) => s + i * v, 0)),
          legend: Object.fromEntries(crit.map((c, i) => [String(i), c])),
          probabilities: Object.fromEntries(p.map((v, i) => [String(i), round4(v)])),
          confidence: round4(confidenceFromProbs(p)),
        };
        answers[qid] = answer;
      } else {
        const answer: NoulAnswer = {
          type: 'noul',
          noul: round4(p[1] ?? 0),
          confidence: round4(confidenceFromProbs(p)),
        };
        answers[qid] = answer;
      }
    });

    return {
      model: 'laya',
      answers: answers as SystemOneResult<Q>['answers'],
      usage: { input_tokens: nTokens, output_tokens: 0 },
    };
  }

  /** Release the ONNX session. The instance must not be used afterwards. */
  async close(): Promise<void> {
    if (this.session?.release) {
      await this.session.release();
    }
    this.session = null;
    this._state = 'NOT_LOADED';
  }
}
