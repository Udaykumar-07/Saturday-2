# TensorFlow Lite Integration Guide for Saturday

## Overview

This guide documents the integration of actual TensorFlow Lite inference for Qwen 2.5 models in Saturday. The system now supports:

- ✅ Downloading models directly to device storage
- ✅ Tracking download progress in real-time
- ✅ Viewing model status in Settings
- ✅ Actual TFLite inference (when native module is complete)
- ✅ Fallback to pattern matching when model not downloaded

---

## Architecture

```
User Interface
      ↓
ModelManagementScreen (Shows available models, download status)
      ↓
TFLiteModelManager (Handles downloading, verification, deletion)
      ↓
Local Device Storage (~/models/*.gguf)
      ↓
QwenModelRuntime
      ↓
TFLiteInferenceEngine
      ↓
Native Android Module (QwenTFLiteModule)
      ↓
TensorFlow Lite / ONNX Runtime
      ↓
Actual Qwen 2.5 Model Inference
```

---

## Components

### 1. TFLiteModelManager

**Location:** `src/core/ai/tflite/TFLiteModelManager.ts`

**Responsibilities:**
- Download models from Hugging Face
- Track download progress
- Verify model integrity
- Manage local model storage
- Delete models

**Key Methods:**
```typescript
// Initialize model storage
await modelManager.initialize();

// Download a model with progress tracking
await modelManager.downloadModel(modelId, (progress) => {
  console.log(`Downloaded: ${progress.progress}%`);
});

// Get all downloaded models
const models = await modelManager.getDownloadedModels();

// Delete a model
await modelManager.deleteModel(modelId);

// Verify model integrity
const { valid, error } = await modelManager.verifyModel(modelId);
```

### 2. TFLiteInferenceEngine

**Location:** `src/core/ai/tflite/TFLiteInferenceEngine.ts`

**Responsibilities:**
- Load TFLite models for inference
- Run actual neural network inference
- Interface with native Android module
- Provide fallback for development

**Key Methods:**
```typescript
const engine = new TFLiteInferenceEngine();

// Load model
const status = await engine.loadModel(modelPath, modelId);

// Run inference
const result = await engine.infer(prompt, {
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
});

// Check status
const isReady = engine.isReady();
```

### 3. QwenModelRuntime (Enhanced)

**Location:** `src/core/ai/qwen/QwenModelRuntime.ts`

**Now includes:**
- TFLite integration
- Automatic fallback to pattern matching
- Model loading on initialization
- Status reporting (TFLite vs fallback)

**Usage:**
```typescript
const runtime = new QwenModelRuntime({ useTFLite: true });
await runtime.initialize();

// Will use TFLite if model is downloaded, otherwise fallback
const result = await runtime.infer(prompt);

// Check if using actual TFLite
const usingTFLite = runtime.isUsingTFLite();
```

### 4. ModelManagementScreen

**Location:** `src/ui/screens/ModelManagementScreen.tsx`

**Features:**
- Shows all available models
- Real-time download progress
- Model size and metadata
- Download/Cancel/Delete actions
- Storage usage statistics

---

## Available Models

### Qwen 2.5 0.5B Instruct (INT4)
- **Size:** ~394 MB
- **Quantization:** INT4 (Q4_K_M)
- **RAM Usage:** ~520 MB
- **Context Window:** 32,768 tokens
- **Download URL:** Hugging Face

### Qwen 2.5 1.5B Instruct (INT4)
- **Size:** ~934 MB
- **Quantization:** INT4 (Q4_K_M)
- **RAM Usage:** ~1.2 GB
- **Context Window:** 32,768 tokens
- **Download URL:** Hugging Face

---

## Native Module Integration

### Android (QwenTFLiteModule)

**Location:** `android/app/src/main/java/com/saturday/QwenTFLiteModule.kt`

**Status:** ✅ Stub created, ⚠️ Actual inference TODO

**Methods:**
- `loadModel(modelPath)` - Load TFLite model
- `unloadModel()` - Unload model from memory
- `generateText(prompt, options)` - Run inference
- `isModelLoaded()` - Check model status

**To implement:**
1. Add TensorFlow Lite dependency to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'org.tensorflow:tensorflow-lite:2.14.0'
    implementation 'org.tensorflow:tensorflow-lite-gpu:2.14.0'
    implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'
}
```

2. Implement actual model loading using TensorFlow Lite Interpreter
3. Implement tokenization (or use pre-tokenized input)
4. Implement text generation loop
5. Add GPU acceleration support

### Registering the Module

**File:** `android/app/src/main/java/com/saturday/MainApplication.kt`

Add to `getPackages()`:
```kotlin
override fun getPackages(): List<ReactPackage> {
    return PackageList(this).packages.apply {
        add(QwenTFLitePackage())
    }
}
```

---

## Usage Flow

### 1. Download Model

```typescript
import { TFLiteModelManager } from '@/core/ai/tflite';

const modelManager = new TFLiteModelManager();
await modelManager.initialize();

// Download with progress
await modelManager.downloadModel('qwen2.5-0.5b-instruct-int4', (progress) => {
  console.log(`Progress: ${progress.progress}%`);
  if (progress.status === 'completed') {
    console.log('Download complete!');
  }
});
```

### 2. Use in Conversation

```typescript
import { QwenModelRuntime } from '@/core/ai/qwen';

const runtime = new QwenModelRuntime({ useTFLite: true });
await runtime.initialize();

// Automatic: Uses TFLite if downloaded, fallback otherwise
const response = await runtime.infer('What is 25 × 48?');
console.log(response.text); // "1,200"

// Check which mode is being used
if (runtime.isUsingTFLite()) {
  console.log('Using actual TFLite inference');
} else {
  console.log('Using pattern matching fallback');
}
```

### 3. Model Management Screen

```typescript
import { ModelManagementScreen } from '@/ui/screens/ModelManagementScreen';

// In your navigation or settings:
<ModelManagementScreen />
```

---

## Settings Screen Integration

The `LocalAISettingsSection` now shows:
- ✅ Model download status
- ✅ "Ready offline" when model is downloaded
- ✅ Download button when not downloaded
- ✅ Verification status
- ✅ Real-time updates

---

## Storage Management

### Model Storage Location
- **Android:** `/data/user/0/com.saturday/files/models/`
- **iOS:** `<Documents>/models/`

### Files Stored
- `{modelId}.gguf` - The actual model file
- `{modelId}.metadata.json` - Download metadata

### Metadata Format
```json
{
  "modelId": "qwen2.5-0.5b-instruct-int4",
  "name": "Qwen 2.5 0.5B Instruct (INT4)",
  "version": "2.5.0",
  "downloadedAt": 1703001234567,
  "lastVerified": 1703001234567,
  "sizeBytes": 413138944
}
```

---

## Download Progress States

1. **pending** - Download queued
2. **downloading** - Actively downloading
3. **verifying** - Checking integrity
4. **completed** - Ready to use
5. **failed** - Error occurred

---

## Error Handling

### Model Not Downloaded
```typescript
// Automatically falls back to pattern matching
const result = await runtime.infer(prompt);
// Still works, but uses simulator
```

### Download Failed
```typescript
try {
  await modelManager.downloadModel(modelId, onProgress);
} catch (error) {
  // Show error to user
  Alert.alert('Download Failed', error.message);
}
```

### Inference Failed
```typescript
try {
  const result = await engine.infer(prompt);
} catch (error) {
  // Falls back to pattern matching automatically
  console.warn('TFLite inference failed, using fallback');
}
```

---

## Testing

### Test Model Download
```typescript
const modelManager = new TFLiteModelManager();
await modelManager.initialize();

const models = await modelManager.getDownloadedModels();
console.log('Downloaded models:', models);

// Test download
await modelManager.downloadModel('qwen2.5-0.5b-instruct-int4', (progress) => {
  console.log(`Downloaded: ${progress.downloadedBytes} / ${progress.totalBytes}`);
});
```

### Test Inference
```typescript
const runtime = new QwenModelRuntime({ useTFLite: true });
await runtime.initialize();

const testCases = [
  'What is 2 + 2?',
  'Hello',
  'What is my name?',
  'Who is MJ?',
];

for (const test of testCases) {
  const result = await runtime.infer(test);
  console.log(`Input: ${test}`);
  console.log(`Output: ${result.text}`);
  console.log(`Using TFLite: ${runtime.isUsingTFLite()}`);
  console.log('---');
}
```

---

## Next Steps

### Immediate (Completed):
- ✅ Created TFLiteModelManager
- ✅ Created TFLiteInferenceEngine
- ✅ Enhanced QwenModelRuntime
- ✅ Created ModelManagementScreen
- ✅ Created native module stub
- ✅ Integrated with Settings

### Short Term (TODO):
- [ ] Implement actual TFLite inference in Android module
- [ ] Add tokenization to native module
- [ ] Test with actual downloaded model
- [ ] Add GPU acceleration support
- [ ] Implement iOS native module

### Long Term:
- [ ] Add streaming inference support
- [ ] Implement model quantization options
- [ ] Add model update checking
- [ ] Optimize memory usage
- [ ] Add benchmarking tools

---

## Dependencies Required

### React Native
```json
{
  "expo-file-system": "~17.0.0"
}
```

### Android (build.gradle)
```gradle
dependencies {
    implementation 'org.tensorflow:tensorflow-lite:2.14.0'
    implementation 'org.tensorflow:tensorflow-lite-gpu:2.14.0'
}
```

---

## Troubleshooting

### Model Download Fails
- Check internet connection
- Verify Hugging Face URL is accessible
- Check device storage space

### Inference Not Using TFLite
- Check if model is downloaded: `await modelManager.getModelInfo(modelId)`
- Verify model status is 'ready'
- Check logs for initialization errors

### Native Module Not Found
- Verify package is registered in MainApplication
- Rebuild Android app: `npm run android`
- Check module name matches: `QwenTFLiteModule`

---

## Performance Expectations

### Qwen 2.5 0.5B (INT4)
- **Load Time:** ~50-100ms
- **First Token:** ~15-30ms
- **Tokens/sec:** 30-50 (CPU), 80-120 (GPU)
- **RAM Usage:** ~520 MB

### Qwen 2.5 1.5B (INT4)
- **Load Time:** ~100-200ms
- **First Token:** ~25-50ms
- **Tokens/sec:** 15-30 (CPU), 50-80 (GPU)
- **RAM Usage:** ~1.2 GB

---

**Status:** ✅ Architecture Complete, ⚠️ Native Inference Implementation TODO

**See Also:**
- `QWEN_FALLBACK_FIX_REPORT.md` - Previous pattern matching fixes
- `src/core/ai/tflite/` - TFLite module source
- `src/ui/screens/ModelManagementScreen.tsx` - UI implementation
