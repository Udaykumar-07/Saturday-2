// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock llama.rn for unit tests
jest.mock('llama.rn', () => ({
  initLlama: jest.fn().mockResolvedValue({
    release: jest.fn(),
    createContext: jest.fn(),
  }),
}));

// Mock onnxruntime-react-native for unit tests
jest.mock('onnxruntime-react-native', () => ({
  InferenceSession: {
    create: jest.fn().mockResolvedValue({
      inputNames: ['input_ids', 'attention_mask', 'marker_pos', 'marker_mask', 'qtype'],
      outputNames: ['logits', 'act_probs'],
      run: jest.fn().mockResolvedValue({}),
    }),
  },
  Tensor: jest.fn().mockImplementation((type, data, dims) => ({
    type,
    data,
    dims,
  })),
}));

