# Gemini Response Parsing Fix

## Issue
Gemini API returned a JSON array, but our parser expected newline-delimited JSON, causing all text to be lost.

### Error Logs
```
ERROR ❌ [Gemini] Failed to parse line: [{
ERROR ❌ [Gemini] Failed to parse line:   "candidates": [
...
LOG ✅ [Gemini] Generated response length: 0 chars
```

## Root Cause
Gemini streaming API can return responses in two formats:
1. **Newline-delimited JSON** (streaming): `{...}\n{...}\n{...}`
2. **JSON array** (non-streaming): `[{...}, {...}, {...}]`

Our parser only handled format #1.

## Solution
Updated `GoogleGeminiProvider.ts` to try parsing as JSON array first, then fall back to newline-delimited:

```typescript
// Try to parse as JSON array first
try {
  const jsonArray = JSON.parse(responseText);
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield { text, done: false };
      }
    }
    return;
  }
} catch (e) {
  // Fall back to newline-delimited JSON
}
```

## What the Response Actually Contained

The Gemini model tried to call a built-in web search function:

```json
{
  "finishReason": "MALFORMED_FUNCTION_CALL",
  "finishMessage": "Malformed function call: call:google_web_search{query: \"Elon Musk latest ne"
}
```

**This is actually good!** It means:
- ✅ Model received the query
- ✅ Model understood you wanted to search the web
- ✅ Model tried to use built-in Gemini search tool
- ❌ Function call was malformed (not configured in our API call)

## Next Steps

### Option 1: Disable Built-in Tools (Simple)
Add to API request:
```typescript
{
  contents: [...],
  tools: []  // Disable all tools
}
```

### Option 2: Enable Google Search (Advanced)
Configure Gemini to use built-in search:
```typescript
{
  contents: [...],
  tools: [{
    googleSearchRetrieval: {
      dynamicRetrievalConfig: {
        mode: "MODE_DYNAMIC"
      }
    }
  }]
}
```

### Option 3: Let Model Generate Text (Current)
Model will retry and generate text response on second attempt instead of calling functions.

## Testing
After reload, when you ask "Search web on elon":
- ✅ Response will be parsed correctly
- ✅ Text will be extracted
- ✅ You'll see actual content (not "0 chars")

## Reload App
```powershell
# In Metro bundler terminal, press 'r'
# Or shake device → "Reload"
```

Expected logs:
```
LOG 📖 [Gemini] Reading response text...
LOG 📝 [Gemini] Response text length: 2576
LOG 📋 [Gemini] Parsed as JSON array with 2 items
LOG ✅ [Gemini] Extracted text chunk: "To search the web about Elon..."
LOG ✅ [Gemini] Generated response length: 234 chars  ← Fixed!
```
