# Testing Instructions for Model Selection Features

## Current Status

✅ **All Features Implemented:**
1. Model selection during Gemini connection
2. Model switching after connection
3. Dynamic model loading from Gemini API
4. Fixed React Native streaming bug

✅ **Modified to Use Buttons Instead of Picker:**
- Replaced dropdown picker with touch-friendly button UI
- Works without native rebuild
- Can test immediately with Metro bundler

## How to Test

### Option 1: Using Development Server (RECOMMENDED - No Build Required)

1. **Start the Metro bundler:**
   ```powershell
   cd C:\Users\uk\Pictures\Saturday-2
   npx expo start
   ```

2. **On your Android device:**
   - If the app is already installed from a previous build, it will hot-reload with your changes
   - Press `a` in the terminal to open on Android
   - Or scan the QR code if using Expo Go

3. **Test the features:**
   - Open Settings → External AI Providers
   - Click "Connect" on Google Gemini
   - Enter your API key: `AIza...`
   - Click "📋 Fetch Available Models"
   - You should see multiple models appear
   - Select one and click "Save"
   - After connecting, you'll see "Available Models" with buttons
   - Tap different model buttons to switch between them
   - Try asking "Search web" to test if it uses the selected model

### Option 2: Fix Native Build (If You Need Full Native Features)

The native build is failing due to Gradle/ONNX compatibility. To fix:

1. **Clear all Gradle caches:**
   ```powershell
   cd C:\Users\uk\Pictures\Saturday-2
   Remove-Item -Recurse -Force android\.gradle
   Remove-Item -Recurse -Force android\app\build
   Remove-Item -Recurse -Force android\build
   Remove-Item -Recurse -Force $env:USERPROFILE\.gradle\caches
   ```

2. **Try building again:**
   ```powershell
   npx expo run:android
   ```

3. **If still failing, try without ONNX:**
   Temporarily remove onnxruntime from package.json and rebuild

## What You'll See

### Before Connection:
```
┌─────────────────────────────────────┐
│ Google Gemini            [Not Connected] │
│ Gemini 1.5 Pro, Gemini 1.5 Flash   │
│                                     │
│ [           Connect           ]     │
└─────────────────────────────────────┘
```

### During Connection (After Fetch Models):
```
┌─────────────────────────────────────┐
│ Connect Google Gemini               │
│                                     │
│ API Key                            │
│ [••••••••••••••••••••••••••]       │
│                                     │
│ 📋 Fetch Available Models           │
│                                     │
│ Select Model                        │
│ ┌─────────────────────────────────┐ │
│ │ Gemini 1.5 Flash          ✓  │ │
│ ├─────────────────────────────────┤ │
│ │ Gemini 1.5 Pro               │ │
│ ├─────────────────────────────────┤ │
│ │ Gemini 2.0 Flash Exp         │ │
│ ├─────────────────────────────────┤ │
│ │ Gemini 1.5 Flash-8B          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Test Connection] [    Save    ]   │
└─────────────────────────────────────┘
```

### After Connection:
```
┌─────────────────────────────────────┐
│ Google Gemini              [✓ Connected] │
│ Current: Gemini 1.5 Flash           │
│                                     │
│ Available Models:                   │
│ ┌─────────────────────────────────┐ │
│ │ Gemini 1.5 Flash          ✓  │ │ ← Currently selected
│ ├─────────────────────────────────┤ │
│ │ Gemini 1.5 Pro               │ │ ← Tap to switch
│ ├─────────────────────────────────┤ │
│ │ Gemini 2.0 Flash Exp         │ │ ← Tap to switch
│ └─────────────────────────────────┘ │
│                                     │
│ [          Disconnect          ]    │
└─────────────────────────────────────┘
```

## Expected Log Output

When you send a query after connecting, you should see in Metro logs:

```
LOG  🔍 Query pattern: general_query
LOG  ✅ External provider available: Google Gemini (google_gemini_provider)
LOG  🌐 Routing to external provider: Google Gemini
LOG  🔑 [Gemini] API key found (length: 39)
LOG  🤖 [Gemini] Using model: gemini-1.5-flash-latest  ← Your selected model
LOG  📖 [Gemini] Reading response text...
LOG  📝 [Gemini] Response text length: 1234
LOG  ✅ [Gemini] Extracted text chunk: "To search the web..."
LOG  ✅ [Google Gemini] Response received: 2100ms
```

## Verification Checklist

- [ ] Metro bundler starts without errors
- [ ] App loads on device
- [ ] Settings screen opens
- [ ] External AI Providers section visible
- [ ] Google Gemini card shows "Not Connected"
- [ ] Click "Connect" opens modal
- [ ] Enter API key
- [ ] Click "Fetch Models" shows loading
- [ ] Models appear in button list (6-8 models)
- [ ] Select a model (button shows ✓)
- [ ] Click "Save" closes modal
- [ ] Provider card shows "Connected"
- [ ] Provider card shows "Current: {model-name}"
- [ ] "Available Models" section shows button list
- [ ] Tap different model buttons to switch
- [ ] Selected model shows ✓ checkmark
- [ ] Ask a query: "Search web"
- [ ] Check logs show correct model being used
- [ ] Response appears in chat
- [ ] No "No response body" error

## Troubleshooting

### "No response body" error:
✅ **FIXED** - Updated GoogleGeminiProvider to use `response.text()` instead of `response.body.getReader()`

### Models don't appear:
- Check your API key is valid
- Check internet connection
- Look for error messages in console
- Verify Gemini API is accessible in your region

### Can't switch models:
- Make sure provider is connected
- Check if models list has more than 1 model
- Look for errors in console when tapping buttons

### Metro bundler won't start:
```powershell
# Kill any existing Metro processes
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*metro*" } | Stop-Process -Force

# Clear Metro cache
npx expo start --clear
```

### TypeScript errors:
```powershell
npx tsc --noEmit
```

## Files Changed

All changes are in TypeScript/JavaScript - no native code changes needed for core functionality:

1. `src/core/external/providers/GoogleGeminiProvider.ts` - Fixed streaming
2. `src/hooks/useExternalProviders.tsx` - Added model management
3. `src/ui/screens/IntegrationsScreen.tsx` - Added UI (using buttons)

## Next Steps

Once you verify the features work:

1. **Test model switching:**
   - Switch between Flash (cheap/fast) and Pro (expensive/smart)
   - Send same query to both and compare responses

2. **Test with different queries:**
   - Simple: "Hello"
   - Complex: "Search web for latest AI news"
   - Verify routing works correctly

3. **Optional: Add Picker back:**
   - Once native build works, uncomment Picker import
   - Replace button UI with Picker UI for dropdown experience

## Support

If you encounter issues:
1. Check Metro bundler logs
2. Check Android logcat: `adb logcat -s "ReactNativeJS"`
3. Look for errors in Settings screen
4. Verify API key is valid at https://aistudio.google.com/app/apikey
