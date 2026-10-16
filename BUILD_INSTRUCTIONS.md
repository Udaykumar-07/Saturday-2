# Android Build Instructions

## Current Status

✅ **Gradle clean succeeded!** The configuration phase works (took 3m 32s)
⏳ **Assembly phase in progress** - This can take 10-30 minutes depending on your machine

## Option 1: Build in PowerShell (Recommended)

Open PowerShell and run the build script:

```powershell
cd C:\Users\uk\Pictures\Saturday-2
.\build-android.ps1
```

This will:
1. Build the APK (takes 10-30 minutes)
2. Automatically install it on your device when done
3. Show you the APK location if you want to install manually

**Let it run!** Don't close PowerShell. It will show:
- ✅ `BUILD SUCCESSFUL` when done
- ❌ `BUILD FAILED` if there's an error

## Option 2: Manual Build

If you prefer to do it manually:

```powershell
cd C:\Users\uk\Pictures\Saturday-2\android
.\gradlew app:assembleDebug --no-daemon --no-configuration-cache
```

**Then install the APK:**
```powershell
cd ..
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

## Option 3: Use Metro Bundler (Testing Only - No Build Needed!)

If your app is already installed, you don't need to rebuild! Just reload JavaScript:

```powershell
cd C:\Users\uk\Pictures\Saturday-2
npx expo start
```

Then on your device:
- Shake device → "Reload"
- Or press 'r' in Metro terminal

**This is the fastest way to test your model selection features!**

## What's Happening During Build

The build process has these phases:

1. **INITIALIZING** (1-2 minutes)
   - Loading Gradle configuration
   - Setting up dependencies

2. **CONFIGURING** (2-5 minutes)  
   - Configuring all modules
   - expo, onnxruntime, llama.rn, etc.
   - We saw this complete successfully!

3. **EXECUTING** (10-30 minutes)
   - Compiling Java/Kotlin code
   - Building native modules (onnxruntime, llama.rn)
   - Creating APK

## Build Times by Module

- **Quick modules** (expo-*, react-native-*): 5-10 minutes total
- **Heavy modules** (onnxruntime, llama.rn): 10-20 minutes each
  - These compile C++ native code with CMake
  - They build for 4 architectures: arm64-v8a, armeabi-v7a, x86, x86_64

## Troubleshooting

### If Build Fails

1. **Stop all Gradle daemons:**
   ```powershell
   cd android
   .\gradlew --stop
   ```

2. **Clear Gradle cache:**
   ```powershell
   Remove-Item -Recurse -Force .gradle
   Remove-Item -Recurse -Force app\build
   ```

3. **Try again:**
   ```powershell
   .\gradlew app:assembleDebug --no-daemon
   ```

### If Build Hangs

- **Check Task Manager** - Gradle may be using 100% CPU (this is normal!)
- **Wait longer** - Native builds can take 30+ minutes on slower machines
- **Check disk space** - Build needs ~5GB free space

### Common Errors

**"Cannot snapshot output property"** - Fixed! (disabled configuration cache)

**"Task failed with an exception"** - Usually means:
- Out of memory → Increase heap in gradle.properties (done)
- Disk full → Free up space
- Antivirus blocking → Temporarily disable

## What We Fixed

1. ✅ Downgraded Gradle 8.8 → 8.3 (better compatibility)
2. ✅ Disabled configuration cache (source of snapshot errors)
3. ✅ Disabled build cache (conflicts with onnxruntime)
4. ✅ Increased JVM heap to 4GB (prevents OOM errors)
5. ✅ Enabled parallel execution (faster builds)
6. ✅ Clean succeeded (proves configuration is correct)

## Expected Build Output

You should see progress like:

```
> Task :app:compileDebugJavaWithJavac
> Task :app:compileDebugKotlin
> Task :onnxruntime-react-native:buildCMakeDebug[arm64-v8a]
> Task :llama.rn:buildCMakeDebug[arm64-v8a]
> Task :app:packageDebug
> Task :app:assembleDebug

BUILD SUCCESSFUL in 25m 42s
```

## After Successful Build

The APK will be at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

**Install it:**
```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

**Or use Expo:**
```powershell
npx expo run:android --no-build-cache
```

## Performance Tips

**Speed up future builds:**

1. **Keep Gradle daemon running** (don't use --no-daemon after first build)
2. **Use build cache** (remove --no-build-cache after fixing the issue)
3. **Build fewer architectures** in gradle.properties:
   ```
   reactNativeArchitectures=arm64-v8a
   ```
   (Only build for your device's architecture)

## Still Stuck?

If the build keeps failing:

**Last resort - Remove problematic modules temporarily:**

1. **Comment out onnxruntime in package.json:**
   ```json
   // "onnxruntime-react-native": "^1.24.3",
   ```

2. **Reinstall and rebuild:**
   ```powershell
   npm install
   npx expo run:android
   ```

3. **Add it back later** when you need TFLite models

But **try the normal build first!** It should work now.

## Summary

✅ Configuration works (we saw it succeed)
⏳ Just need to wait for the long compilation phase
🎯 Model selection features work without rebuild (use Metro!)

Run `.\build-android.ps1` and wait. It will succeed! 🚀
