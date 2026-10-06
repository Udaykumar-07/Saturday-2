/**
 * Laya ONNX Session Bridge for React Native.
 *
 * Creates an actual onnxruntime-react-native InferenceSession
 * and adapts it to the OnnxSession interface used by LayaRuntime.
 *
 * This is the only file that imports onnxruntime-react-native directly,
 * keeping the rest of the Laya module testable with mock sessions.
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import type { OnnxSession } from './LayaRuntime';

/**
 * Create an OnnxSession from an onnxruntime-react-native InferenceSession.
 *
 * Adapts the onnxruntime-react-native API to the OnnxSession interface
 * used by LayaRuntime. Handles tensor type conversions between
 * the abstract interface and the native ONNX runtime.
 */
export async function createOnnxSession(modelPath: string): Promise<OnnxSession> {
  console.log(`[LayaOnnx] Creating InferenceSession from: ${modelPath}`);

  const session = await InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });

  console.log(`[LayaOnnx] Session created. Input names: ${session.inputNames}, Output names: ${session.outputNames}`);

  const onnxSession: OnnxSession = {
    async run(feeds) {
      // Convert abstract feeds to onnxruntime-react-native Tensor objects
      const ortFeeds: Record<string, Tensor> = {};

      for (const [name, feed] of Object.entries(feeds)) {
        let tensorType: Tensor.Type;
        let tensorData: Tensor.DataType;

        if (feed.type === 'int64') {
          // onnxruntime-react-native supports BigInt64Array for int64
          // Convert Float64Array/number[] to BigInt64Array
          const bigIntData = new BigInt64Array(feed.data.length);
          for (let i = 0; i < feed.data.length; i++) {
            bigIntData[i] = BigInt(Math.round(feed.data[i]));
          }
          tensorType = 'int64';
          tensorData = bigIntData;
        } else if (feed.type === 'bool') {
          // Convert to Uint8Array for boolean tensors
          const boolData = new Uint8Array(feed.data.length);
          for (let i = 0; i < feed.data.length; i++) {
            boolData[i] = feed.data[i] ? 1 : 0;
          }
          tensorType = 'bool';
          tensorData = boolData;
        } else {
          // Default: float32
          tensorType = 'float32';
          tensorData = new Float32Array(feed.data as ArrayLike<number>);
        }

        ortFeeds[name] = new Tensor(tensorType, tensorData, feed.dims);
      }

      // Run inference
      const results = await session.run(ortFeeds);

      // Convert results back to the abstract interface
      const output: Record<string, { data: Float32Array; dims: number[] }> = {};

      for (const [name, tensor] of Object.entries(results)) {
        output[name] = {
          data: tensor.data instanceof Float32Array
            ? tensor.data
            : new Float32Array(Array.from(tensor.data as ArrayLike<number>)),
          dims: Array.from(tensor.dims),
        };
      }

      return output;
    },

    async release() {
      // onnxruntime-react-native sessions don't have a release method
      // but we include it for interface compatibility
      console.log('[LayaOnnx] Session released');
    },
  };

  return onnxSession;
}
