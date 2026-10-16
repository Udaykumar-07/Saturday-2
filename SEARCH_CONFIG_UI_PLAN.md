# Search Configuration UI - Future Enhancement

## Goal
Allow users to configure Google Custom Search API directly in the app settings, without editing code.

## UI Location
**Settings → External AI Providers → Web Search Configuration**

## UI Mockup

```
┌─────────────────────────────────────────┐
│ Web Search Configuration                │
├─────────────────────────────────────────┤
│                                         │
│ Search Provider:                        │
│ ○ DuckDuckGo (Free, Private)           │
│ ● Google Custom Search (Best Quality)   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Google Custom Search Setup          │ │
│ │                                     │ │
│ │ Status: ⚠️ Not Configured           │ │
│ │                                     │ │
│ │ API Key:                            │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ AIzaSyD...                      │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ Search Engine ID:                   │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ 0123456789abcdef:ghi            │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ [Test Connection]  [Setup Guide]    │ │
│ │                                     │ │
│ │ Usage: 23/100 queries today         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Save Configuration]                    │
│                                         │
└─────────────────────────────────────────┘
```

## Implementation

### 1. Add to IntegrationsScreen.tsx

```typescript
// State
const [searchProvider, setSearchProvider] = useState<'duckduckgo' | 'google'>('duckduckgo');
const [googleSearchConfig, setGoogleSearchConfig] = useState({
  apiKey: '',
  searchEngineId: '',
});

// Test connection
const testGoogleSearch = async () => {
  try {
    const testTool = new GoogleSearchTool(
      googleSearchConfig.apiKey,
      googleSearchConfig.searchEngineId
    );
    const results = await testTool.search('test');
    alert('✅ Connection successful!');
  } catch (error) {
    alert('❌ Connection failed: ' + error.message);
  }
};

// Save configuration
const saveSearchConfig = async () => {
  await AsyncStorage.setItem('search_config', JSON.stringify({
    provider: searchProvider,
    google: googleSearchConfig,
  }));
  
  // Update runtime config
  updateGoogleSearchConfig(
    googleSearchConfig.apiKey,
    googleSearchConfig.searchEngineId
  );
  
  alert('✅ Configuration saved!');
};
```

### 2. Add Storage Helper

```typescript
// src/services/SearchConfigStorage.ts

export class SearchConfigStorage {
  private static KEY = 'search_config';
  
  static async load(): Promise<SearchConfig> {
    const stored = await AsyncStorage.getItem(this.KEY);
    if (!stored) return this.getDefault();
    return JSON.parse(stored);
  }
  
  static async save(config: SearchConfig): Promise<void> {
    await AsyncStorage.setItem(this.KEY, JSON.stringify(config));
  }
  
  static getDefault(): SearchConfig {
    return {
      provider: 'duckduckgo',
      google: { apiKey: '', searchEngineId: '' },
    };
  }
}
```

### 3. Load on App Start

```typescript
// In App.tsx or container.ts initialization

const loadSearchConfig = async () => {
  const config = await SearchConfigStorage.load();
  
  if (config.provider === 'google' && config.google.apiKey) {
    updateGoogleSearchConfig(
      config.google.apiKey,
      config.google.searchEngineId
    );
    console.log('✅ Loaded Google Custom Search configuration');
  }
};
```

## Benefits

### User-Friendly
- ✅ No code editing required
- ✅ Test connection before saving
- ✅ Visual setup guide link
- ✅ Usage quota display

### Secure
- ✅ Stored in device AsyncStorage
- ✅ Never committed to git
- ✅ Can be cleared anytime

### Flexible
- ✅ Switch providers easily
- ✅ Update credentials without app rebuild
- ✅ Test configuration before use

## Setup Guide Link

The "Setup Guide" button opens `GOOGLE_SEARCH_SETUP.md` content in a modal or external browser.

## Priority

**Phase 1** (Current): Manual configuration via code ✅  
**Phase 2** (Next): UI-based configuration  
**Phase 3** (Future): Advanced features (caching, quota alerts, etc.)

---

**For now, users configure via `src/config/searchConfig.ts` (already implemented).**
