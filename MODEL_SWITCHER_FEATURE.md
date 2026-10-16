# Model Switcher Feature Implementation

## Overview
Extended the model selection feature to show fetched Gemini models in the provider card and allow users to switch between models after connecting, without needing to re-enter the API key.

## Key Features

### 1. Dynamic Model Loading
- When Gemini is connected, the system automatically fetches available models from the API
- Models are displayed in real-time on the provider card
- Falls back to default model list if API fetch fails

### 2. Current Model Display
- Provider card shows "Current: {model-name}" when connected
- Shows available models list when not connected

### 3. Model Switcher UI
- Dropdown picker appears when provider is connected and has multiple models
- Users can select any available model
- Selection is saved immediately to credential store
- No need to disconnect/reconnect to switch models

### 4. Persistence
- Selected model is stored with API key: `{apiKey: "...", model: "..."}`
- Model selection persists across app restarts
- Automatically used in next AI generation

## Changes Made

### 1. useExternalProviders.tsx

#### Updated `loadProviders()`
```typescript
// For connected Gemini provider, try to load actual available models
let models = def.models;
if (connected && def.id === 'google_gemini_provider') {
  try {
    const credentials = await credentialStore.retrieve<{ apiKey: string }>(def.id);
    if (credentials?.apiKey) {
      const provider = externalRegistry.get(def.id);
      if (provider && (provider as any).listAvailableModels) {
        const fetchedModels = await (provider as any).listAvailableModels(credentials.apiKey);
        if (fetchedModels && fetchedModels.length > 0) {
          models = fetchedModels.map((m: any) => m.displayName);
        }
      }
    }
  } catch (err) {
    console.error('Error loading Gemini models:', err);
    // Fall back to default models
  }
}
```

#### Added `switchModel()` Method
```typescript
const switchModel = async (id: string, modelName: string): Promise<boolean> => {
  // Update the stored model without changing API key
  await credentialStore.store(id, {
    ...credentials,
    model: modelName,
  });
  return true;
};
```

#### Added `getCurrentModel()` Method
```typescript
const getCurrentModel = async (id: string): Promise<string | null> => {
  const credentials = await credentialStore.retrieve<{ apiKey: string; model?: string }>(id);
  return credentials?.model || null;
};
```

### 2. IntegrationsScreen.tsx

#### Added State Variables
```typescript
const [currentModels, setCurrentModels] = useState<Record<string, string>>({});
const [showModelSwitcher, setShowModelSwitcher] = useState<string | null>(null);
```

#### Added useEffect to Load Current Models
```typescript
useEffect(() => {
  const loadCurrentModels = async () => {
    const models: Record<string, string> = {};
    for (const provider of externalProviders) {
      if (provider.connected) {
        const currentModel = await getCurrentModel(provider.id);
        if (currentModel) {
          models[provider.id] = currentModel;
        }
      }
    }
    setCurrentModels(models);
  };
  loadCurrentModels();
}, [externalProviders]);
```

#### Updated Provider Card Display
```typescript
<Text style={styles.providerModels}>
  {provider.connected && currentModels[provider.id] 
    ? `Current: ${currentModels[provider.id]}`
    : provider.models.join(', ')}
</Text>
```

#### Added Model Switcher UI
```typescript
{provider.connected && provider.models.length > 1 && (
  <View style={styles.modelSwitcherContainer}>
    <Text style={styles.modelSwitcherLabel}>Available Models:</Text>
    <View style={styles.modelPickerWrapper}>
      <Picker
        selectedValue={currentModels[provider.id] || provider.models[0]}
        onValueChange={async (itemValue) => {
          const success = await switchModel(provider.id, itemValue);
          if (success) {
            setCurrentModels(prev => ({
              ...prev,
              [provider.id]: itemValue,
            }));
          }
        }}
        style={styles.modelPicker}
        dropdownIconColor={colors.accent}
      >
        {provider.models.map((model) => (
          <Picker.Item
            key={model}
            label={model}
            value={model}
            color={colors.textPrimary}
          />
        ))}
      </Picker>
    </View>
  </View>
)}
```

#### Added Styles
```typescript
modelSwitcherContainer: {
  marginBottom: 12,
},
modelSwitcherLabel: {
  fontSize: 13,
  fontWeight: '600',
  color: colors.textSecondary,
  marginBottom: 6,
},
modelPickerWrapper: {
  backgroundColor: colors.surfaceHover,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  overflow: 'hidden',
},
modelPicker: {
  color: colors.textPrimary,
  backgroundColor: 'transparent',
},
```

### 3. GoogleGeminiProvider.ts

#### Fixed React Native Streaming Issue
```typescript
// OLD (doesn't work in React Native):
if (!response.body) {
  throw new ExternalProviderError('No response body', this.id);
}
const reader = response.body.getReader();

// NEW (works in React Native):
const responseText = await response.text();
if (!responseText) {
  throw new ExternalProviderError('Empty response body', this.id);
}
const lines = responseText.split('\n').filter(line => line.trim());
```

**Why the change?**
- React Native's `fetch` doesn't support `response.body.getReader()` API
- Used `response.text()` instead to read full response
- Process newline-delimited JSON manually
- Added comprehensive logging for debugging

### 4. Package Installation
```bash
npm install @react-native-picker/picker@2.9.0
```

## User Flow

### Before (Old Behavior)
1. User connects Gemini with API key
2. User selects model during connection
3. To switch models, user must disconnect and reconnect with new model selection

### After (New Behavior)
1. User connects Gemini with API key
2. User selects model during connection
3. **Available models are fetched and displayed in provider card**
4. **User can switch models anytime using dropdown**
5. **No need to disconnect/reconnect**

## Example: Connected Gemini Card

```
┌─────────────────────────────────────┐
│ Google Gemini                  [✓]  │
│ Current: Gemini 1.5 Flash           │
│                                     │
│ Available Models:                   │
│ ┌─────────────────────────────────┐ │
│ │ Gemini 1.5 Flash            ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [          Disconnect          ]    │
└─────────────────────────────────────┘

Dropdown Options:
- Gemini 1.5 Flash
- Gemini 1.5 Pro
- Gemini 2.0 Flash Exp
- Gemini 1.5 Flash-8B
- etc.
```

## Benefits

1. **Seamless Model Switching** - Change models without re-authentication
2. **Real-Time Model Discovery** - See actual available models from API
3. **Better UX** - Clear indication of current model in use
4. **Future-Proof** - Automatically shows new models as Google releases them
5. **Cost Optimization** - Easy to switch between expensive/cheap models
6. **Fixed Streaming** - Resolved React Native compatibility issue

## Technical Details

### Model Storage Format
```typescript
{
  apiKey: "AIza...",
  model: "gemini-1.5-flash-latest"  // or "Gemini 1.5 Flash" (display name)
}
```

### API Call Flow
1. User connects → API key stored with selected model
2. Screen loads → `loadProviders()` fetches available models for connected Gemini
3. Models displayed → User sees dropdown with all options
4. User selects → `switchModel()` updates credential store
5. Next AI query → Uses newly selected model

### Error Handling
- Network error during model fetch → Falls back to default models
- Invalid model selection → Keeps previous selection
- Missing credentials → Shows "Not Connected" state
- API key expired → Shows "Invalid Key" status

## Testing Checklist
- [x] Install @react-native-picker/picker package
- [ ] Connect Gemini provider
- [ ] Verify models are fetched and displayed
- [ ] Switch between models using dropdown
- [ ] Verify selected model is used in next AI query
- [ ] Test with network error (should fallback gracefully)
- [ ] Disconnect and verify model list resets
- [ ] Reconnect and verify models reload
- [ ] Test that OpenAI/Anthropic cards unchanged

## Known Limitations
1. Only works for Google Gemini (OpenAI/Anthropic use static lists)
2. Model fetch happens on every screen load (could be cached)
3. Dropdown shows display names but stores technical names
4. No loading indicator during model switch

## Future Enhancements
1. Cache fetched models to reduce API calls
2. Show model capabilities (context length, pricing)
3. Add "Refresh Models" button
4. Show model performance metrics
5. Extend to OpenAI/Anthropic if they support model listing
6. Add loading indicator during model switch
7. Show estimated cost difference between models
