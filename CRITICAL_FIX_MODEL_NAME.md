# Critical Fix: Model Name Format Issue

## Problem
The Gemini API is receiving display names (e.g., "Gemini 3.6 Flash") instead of technical names (e.g., "gemini-3.6-flash"), causing 400 errors:

```
ERROR: unexpected model name format
URL: https://.../models/Gemini 3.6 Flash:streamGenerateContent
```

## Root Cause
When switching models, we're storing the display name instead of the technical model ID.

## Solution Implemented

### 1. Added ModelMap to Provider Status
```typescript
export interface ExternalProviderStatus {
  id: string;
  name: string;
  connected: boolean;
  valid: boolean;
  models: string[];  // Display names for UI
  modelMap?: Record<string, string>; // displayName -> technicalName
}
```

### 2. Updated loadProviders to Build Mapping
```typescript
fetchedModels.forEach((m: any) => {
  modelMap[m.displayName] = m.name;  // "Gemini 3.6 Flash" -> "gemini-3.6-flash"
});
```

### 3. Updated Model Switching to Use Technical Names
```typescript
// In IntegrationsScreen model button onPress:
const technicalName = provider.modelMap?.[model] || model;
const success = await switchModel(provider.id, technicalName);
```

## Testing
After reload, when you switch models:
1. UI shows: "Gemini 3.6 Flash" (display name)
2. Stored: "gemini-3.6-flash" (technical name)
3. API receives: "gemini-3.6-flash" ✅

## Logs Should Show
```
LOG  🤖 [Gemini] Using model: gemini-3.6-flash  ← Fixed!
LOG  🌐 [Gemini] API URL: .../models/gemini-3.6-flash:streamGenerateContent
LOG  📥 [Gemini] Response status: 200  ← Success!
```

## Reload App
```powershell
# In Metro bundler terminal, press 'r' to reload
# Or shake device and tap "Reload"
```
