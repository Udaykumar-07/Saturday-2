# llama.cpp Native Library Issue

## Problem

The `de.kherud:llama:3.2.0` library doesn't include native `.so` files for Android ARM architectures.

**Error:**
```
No native library found for os.name=Linux-Android, os.arch=aarch64,
paths=[Directly from .apk/lib:/system/lib64]
```

## Root Cause

The `de.kherud:llama` library is designed for desktop Java applications, not Android. It doesn't ship with Android-compatible native libraries.

## Solutions

### Option 1: Use llama.cpp Android (Recommended) ⭐

Use the official llama.cpp Android implementation:

```gradle
// Add jitpack repository
repositories {
    maven { url 'https://jitpack.io' }
}

dependencies {
    implementation 'com.github.ggerganov:llama.cpp:master-SNAPSHOT'
}
```

**Pros:**
- Official llama.cpp Android build
- Includes pre-compiled `.so` files
- Actively maintained
- ARM, ARM64, x86, x86_64 support

**Cons:**
- Need to use JNI directly (no Java wrapper)
- More complex integration

---

### Option 2: Build llama.cpp Locally

Build the native libraries yourself and bundle them:

1. Clone llama.cpp: `git clone https://github.com/ggerganov/llama.cpp`
2. Build for Android: `cd llama.cpp && make android`
3. Copy `.so` files to `android/app/src/main/jniLibs/`
4. Create JNI wrapper

**Pros:**
- Full control
- Latest llama.cpp code
- Can optimize for specific device

**Cons:**
- Complex setup
- Need Android NDK
- Manual updates

---

### Option 3: Use llama.cpp via Termux/External Process

Run llama.cpp as external process:

```kotlin
val process = Runtime.getRuntime().exec(
    arrayOf("/data/data/com.saturday.ai/files/llamacpp", "-m", modelPath, "-p", prompt)
)
```

**Pros:**
- Simplest integration
- No JNI needed

**Cons:**
- Slower (IPC overhead)
- Process management complexity
- Less elegant

---

### Option 4: Switch Back to Mock Until Native Works

Temporarily use mock responses while we fix native:

```kotlin
// In LlamaCppModule.kt
@ReactMethod
fun infer(..., promise: Promise) {
    // Temporary mock until native library works
    val result = Arguments.createMap()
    result.putString("text", "Mock response: I understand your request about '$prompt'...")
    promise.resolve(result)
}
```

---

## Recommended Path Forward

**Use Option 1: llama.cpp Android official build**

I'll implement this now by:
1. Adding JitPack repository
2. Adding llama.cpp Android dependency
3. Creating JNI wrapper for Java/Kotlin
4. Updating LlamaCppModule to use JNI

This will give you real inference with proper native library support.

**Proceed?**
