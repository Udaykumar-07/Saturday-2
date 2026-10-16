# Model Selection Feature Implementation

## Overview
Added the ability to fetch and select available models from Google Gemini API when connecting the provider. Users can now see all available models for their API key and choose which one to use.

## Changes Made

### 1. IntegrationsScreen.tsx
Added UI components to fetch and display available Gemini models:

#### Features Added:
- **Fetch Models Button**: After entering API key, users can click "📋 Fetch Available Models" to query the Gemini API
- **Loading State**: Shows ActivityIndicator while fetching models
- **Model Picker**: Displays all available models in a selectable list with:
  - Model display name (human-readable)
  - Model description
  - Model ID (technical identifier)
  - Radio button selection
- **Validation**: Requires API key before fetching, requires model selection before saving (for Gemini)
- **State Management**: Properly resets state when modal opens/closes
- **Success/Error Feedback**: Shows messages for fetch success/failure

#### State Variables Added:
```typescript
const [selectedModel, setSelectedModel] = useState<string>('');
const [availableModels, setAvailableModels] = useState<Array<{ 
  name: string; 
  displayName: string; 
  description: string 
}>>([]);
const [fetchingModels, setFetchingModels] = useState(false);
```

#### New Styles:
- `fetchModelsButton` / `fetchModelsButtonText` - Button to trigger model fetch
- `modelSelectionContainer` - Container for model picker
- `modelPickerContainer` - Scrollable list of models
- `modelOption` / `modelOptionSelected` - Individual model cards
- `modelOptionHeader` - Header with name and radio
- `modelOptionName` / `modelOptionNameSelected` - Model name text
- `modelOptionDescription` - Model description text
- `modelOptionId` - Technical model ID
- `modelRadio` / `modelRadioSelected` / `modelRadioInner` - Radio button components

### 2. useExternalProviders.tsx
Updated `connectProvider` to accept and store model selection:

#### Before:
```typescript
const connectProvider = async (id: string, apiKey: string): Promise<boolean>
```

#### After:
```typescript
const connectProvider = async (id: string, apiKey: string, model?: string): Promise<boolean>
```

#### Storage:
```typescript
const credentials: any = { apiKey };
if (model) {
  credentials.model = model;
}
await credentialStore.store(id, credentials);
```

### 3. GoogleGeminiProvider.ts
Already had `listAvailableModels()` method implemented:

```typescript
async listAvailableModels(apiKey: string): Promise<Array<{
  name: string;
  displayName: string;
  description: string;
  supportedMethods: string[];
}>>
```

Features:
- Fetches models from `https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}`
- Filters models that support `generateContent` or `streamGenerateContent`
- Removes 'models/' prefix from model names
- Returns structured model objects with metadata
- Comprehensive error handling and logging

## User Flow

1. User clicks "Connect" on Google Gemini provider card
2. Modal opens, user enters API key
3. User clicks "📋 Fetch Available Models"
4. System fetches models from Gemini API (shows loading indicator)
5. Success message shows number of models found
6. Model picker displays all available models with descriptions
7. User selects their preferred model (e.g., gemini-1.5-pro, gemini-1.5-flash-latest)
8. User clicks "Save"
9. System stores both API key AND selected model
10. Modal closes, provider shows as "Connected"

## Technical Details

### API Endpoint
```
GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}
```

### Response Format
```json
{
  "models": [
    {
      "name": "models/gemini-1.5-pro",
      "displayName": "Gemini 1.5 Pro",
      "description": "Mid-size multimodal model...",
      "supportedGenerationMethods": ["generateContent", "streamGenerateContent"]
    }
  ]
}
```

### Stored Credentials Format
```typescript
{
  apiKey: string;
  model?: string; // e.g., "gemini-1.5-flash-latest"
}
```

### Model Usage
When `GoogleGeminiProvider.execute()` is called:
```typescript
const config = await credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
const model = config.model || 'gemini-1.5-flash-latest'; // Use selected or default
```

## Benefits

1. **User Choice**: Users can select the optimal model for their needs (speed vs capability)
2. **Future-Proof**: Automatically shows new models as Google releases them
3. **Cost Optimization**: Users can choose flash models to save costs
4. **Transparency**: Users see exactly which model they're using
5. **Validation**: Only shows models that support text generation

## Feature-Specific for Gemini
- Only shows "Fetch Models" button for `google_gemini_provider`
- Other providers (OpenAI, Anthropic) use predefined model lists
- Can be extended to other providers if they support model listing APIs

## Error Handling
- Invalid API key: Shows error message "No models found. Check your API key"
- Network error: Shows error with technical details
- No models support generation: Returns empty list with error message
- Missing API key: Prompts user to enter API key first

## Next Steps (Future Enhancements)
1. Show model capabilities/limits (context window, rate limits)
2. Show cost comparison between models
3. Allow model switching without re-entering API key
4. Cache model list to avoid repeated API calls
5. Extend to OpenAI/Anthropic if they support dynamic model discovery
6. Add model performance benchmarks/recommendations

## Testing Checklist
- [ ] Enter API key and fetch models
- [ ] Verify models are displayed with names/descriptions
- [ ] Select different models and verify selection UI
- [ ] Save with selected model and verify storage
- [ ] Verify stored model is used in AI generation
- [ ] Test error handling with invalid API key
- [ ] Test modal open/close state reset
- [ ] Verify only Gemini shows fetch button
- [ ] Test with multiple providers (ensure no interference)
- [ ] Verify privacy notice and docs link still visible
