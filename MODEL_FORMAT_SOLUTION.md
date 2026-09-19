# Model Format Issue & Solution

## Current Problem

**ONNX Runtime Cannot Load GGUF Models**

The app is downloading `.gguf` files (GGUF format from Hugging Face), but trying to load them with ONNX Runtime which requires `.onnx` format.

**Current Flow:**
```
Download: qwen2.5-0.5b-instruct-q4_k_m.gguf (394 MB) ✅
↓
Try to load with: ONNX Runtime ❌
Error: "Model must be in .onnx format"
```

## Solutions

### Option A: Use llama.cpp (RECOMMENDED) ⭐

**Pros:**
- ✅ Native support for GGUF models
- ✅ Highly optimized for mobile inference
- ✅ Used by Ollama, LM Studio, etc.
- ✅ Can use already-downloaded models
- ✅ Active community, well-maintained
- ✅ Built-in quantization support (INT4, INT8, etc.)

**Implementation:**
1. Add llama.cpp Android library dependency
2. Create `LlamaCppModule.kt` (similar to QwenONNXModule)
3. Update `ONNXInferenceEngine.ts` → `LlamaCppInferenceEngine.ts`
4. Keep existing model downloads (they're already GGUF)

**Effort:** ~2-3 hours
**Result:** Real inference working with downloaded models

---

### Option B: Switch to ONNX Models

**Pros:**
- ✅ Keep ONNX Runtime code
- ✅ ONNX is a standard format

**Cons:**
- ❌ Must find/convert Qwen models to ONNX format
- ❌ ONNX Qwen models are harder to find than GGUF
- ❌ Larger file sizes (ONNX typically bigger than GGUF)
- ❌ Need to re-download all models
- ❌ Less mobile-optimized than llama.cpp

**Implementation:**
1. Find ONNX-format Qwen models on Hugging Face
2. Update `AVAILABLE_MODELS` URLs to point to .onnx files
3. Users must re-download models

**Effort:** ~1-2 hours (if ONNX models exist)
**Result:** Real inference with ONNX Runtime

---

### Option C: Convert GGUF to ONNX (NOT RECOMMENDED)

**Cons:**
- ❌ Complex conversion process
- ❌ May lose quantization benefits
- ❌ Adds build-time dependency
- ❌ Not worth the effort

---

## Recommendation: Use llama.cpp

**Why llama.cpp is the best choice:**

1. **Industry Standard**: Used by major LLM tools (Ollama, LM Studio, llama.cpp Python)
2. **Mobile Optimized**: Designed specifically for edge inference
3. **GGUF Native**: The models you're downloading work immediately
4. **Active Development**: Constantly improving performance
5. **No Re-downloads**: Users keep their 394 MB models

**Implementation Plan:**

### Step 1: Add llama.cpp dependency
```gradle
// android/app/build.gradle
implementation 'com.github.kuvaus:LlamaAndroid:1.0.0'
// OR build from source for latest optimizations
```

### Step 2: Create LlamaCppModule.kt
```kotlin
package com.saturday

import com.facebook.react.bridge.*
import de.kherud.llama.LlamaModel
import de.kherud.llama.ModelParameters

class LlamaCppModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private var model: LlamaModel? = null
    
    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        try {
            val params = ModelParameters()
                .setNGpuLayers(0) // CPU inference
                .setContextSize(2048)
            
            model = LlamaModel(modelPath, params)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LOAD_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun infer(prompt: String, maxTokens: Int, temperature: Float, promise: Promise) {
        try {
            val result = model?.generate(prompt, maxTokens, temperature)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INFERENCE_ERROR", e.message, e)
        }
    }
}
```

### Step 3: Update TypeScript
Rename `ONNXInferenceEngine.ts` → `LlamaCppInferenceEngine.ts` and change imports.

### Step 4: Test
Model loads and inference works immediately! 🎉

---

## Current State

**Files Modified Today:**
- ✅ Fixed `activeModel` null handling
- ✅ Added ONNX initialization
- ✅ Added file path cleaning (`file://` → absolute path)
- ✅ Added format validation (rejects .gguf, requires .onnx)

**What Works:**
- ✅ Model download (GGUF format)
- ✅ Settings screen (no crashes)
- ✅ Model selection UI
- ✅ ONNX environment initialization

**What Doesn't Work:**
- ❌ Model loading (format mismatch)
- ❌ Inference (model not loaded)

---

## Next Steps

**Waiting for your decision:**

1. **Implement llama.cpp** (recommended)
   - I can do this now
   - ~2 hours to working inference
   - Use existing downloads

2. **Find ONNX models**
   - I can search Hugging Face
   - Update download URLs
   - Users re-download

3. **Something else?**

Let me know which direction you'd like to go!
