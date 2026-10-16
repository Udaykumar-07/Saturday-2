# Gemini API Debugging - Enhanced Logging

## 🐛 Current Issue

Gemini is being selected and called, but getting an error:
```
✅ External provider available: Google Gemini
🌐 Routing to external provider: Google Gemini
✅ [Google Gemini] Response received: 550ms
❌ [Google Gemini] Request failed: Unknown Google Gemini API error
```

## ✅ Progress So Far

1. ✅ Router detects Gemini
2. ✅ Router routes to Gemini
3. ✅ Adapter calls Gemini execute()
4. ✅ Gemini returns a response (550ms)
5. ❌ But response status is 'failed' with generic error

## 🔧 Enhanced Logging Added

### File 1: `ExternalProviderAdapter.ts`

Added detailed error logging to show:
- Full error object structure
- Error name, message, and stack trace
- Response object details

```typescript
catch (error) {
  console.error(`❌ [${this.name}] Generation error:`, error);
  // Log full error details for debugging
  if (error instanceof Error) {
    console.error(`❌ [${this.name}] Error name: ${error.name}`);
    console.error(`❌ [${this.name}] Error message: ${error.message}`);
    console.error(`❌ [${this.name}] Error stack:`, error.stack);
  }
  if (response.status === 'failed') {
    console.error(`❌ [${this.name}] Full response:`, JSON.stringify(response, null, 2));
  }
  throw error;
}
```

### File 2: `GoogleGeminiProvider.ts`

Added comprehensive logging at every step:

#### In `execute()` method:
```typescript
console.log('🔑 [Gemini] API key found (length:', config.apiKey.length, ')');
console.log('🤖 [Gemini] Using model:', model);
console.log('📝 [Gemini] Input length:', String(request.input).length, 'chars');
console.log('✅ [Gemini] Generated response length:', result.length, 'chars');

catch (error) {
  console.error('❌ [Gemini] Execute error:', error);
  console.error('❌ [Gemini] Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack?.substring(0, 200)
  });
}
```

#### In `generateStream()` method:
```typescript
console.log('🌐 [Gemini] API URL:', url.replace(config.apiKey, 'API_KEY_HIDDEN'));
console.log('📤 [Gemini] Sending request...');
console.log('📦 [Gemini] Request body:', JSON.stringify(requestBody).substring(0, 200));
console.log('📥 [Gemini] Response status:', response.status, response.statusText);

if (!response.ok) {
  const errorBody = await response.text();
  console.error('❌ [Gemini] Error response body:', errorBody.substring(0, 500));
}
```

---

## 🧪 What to Look For in Next Test

When you send "Search web on elon" again, you should now see:

### Success Path:
```
🔑 [Gemini] API key found (length: 39 )
🤖 [Gemini] Using model: gemini-1.5-pro
📝 [Gemini] Input length: 17 chars
🌐 [Gemini] API URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?key=API_KEY_HIDDEN
📤 [Gemini] Sending request...
📦 [Gemini] Request body: {"contents":[{"parts":[{"text":"Search web on elon"}]}]}
📥 [Gemini] Response status: 200 OK
✅ [Gemini] Generated response length: 856 chars
```

### Error Path (current):
```
🔑 [Gemini] API key found (length: XX )
🤖 [Gemini] Using model: gemini-1.5-pro
📝 [Gemini] Input length: 17 chars
🌐 [Gemini] API URL: https://...
📤 [Gemini] Sending request...
📥 [Gemini] Response status: 400/401/403/500 [ERROR]
❌ [Gemini] Error response body: {"error":{"message":"...", "code": ...}}
❌ [Gemini] Execute error: ExternalProviderError: ...
❌ [Gemini] Error details: { name: "ExternalProviderError", message: "..." }
```

---

## 🔍 Common Gemini API Issues

### 1. Invalid API Key Format
- Gemini keys usually start with `AIza...`
- Length: ~39 characters
- **Check logs for**: `API key found (length: XX)`

### 2. Wrong Model Name
- Valid: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-pro`
- Invalid: `gpt-4`, `claude-3`, etc.
- **Check logs for**: `Using model: gemini-1.5-pro`

### 3. API Endpoint Issues
- Correct: `https://generativelanguage.googleapis.com/v1beta/models/...`
- **Check logs for**: `API URL: https://...`

### 4. Request Format Issues
- Must have `contents` array with `parts` containing `text`
- **Check logs for**: `Request body: {"contents":[...]}`

### 5. Response Parsing Issues
- Response should be streaming JSON chunks
- Each chunk: `{"candidates":[{"content":{"parts":[{"text":"..."}]}}]}`
- **Check logs for**: `Response status: 200 OK`

### 6. Network/CORS Issues (React Native)
- React Native may have network security restrictions
- Fetch might fail silently
- **Check logs for**: `Network/fetch error detected`

---

## 🎯 Debugging Steps

### Step 1: Verify API Key
Look for:
```
🔑 [Gemini] API key found (length: 39 )
```
If length is wrong (not ~39), API key might be malformed.

### Step 2: Check HTTP Status
Look for:
```
📥 [Gemini] Response status: 200 OK
```
- **200**: Success ✅
- **400**: Bad request (check format)
- **401/403**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Gemini server error

### Step 3: Read Error Body
If status is not 200:
```
❌ [Gemini] Error response body: {"error":{"message":"API key not valid", ...}}
```
This will tell you EXACTLY what Gemini is complaining about!

### Step 4: Check Response Structure
If status is 200 but no text generated, check streaming chunks.

---

## 🔧 Possible Fixes Based on Error

### Error: "API key not valid"
**Fix:** Regenerate API key at https://aistudio.google.com/app/apikey

### Error: "Model not found"
**Fix:** Update model name to `gemini-1.5-flash` (free tier) or `gemini-1.5-pro`

### Error: "Safety settings"
**Fix:** Content was blocked. Add safety settings bypass:
```typescript
body: JSON.stringify({
  contents: [...],
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE"
    }
  ]
})
```

### Error: Network timeout
**Fix:** Check internet connection or use longer timeout

---

## 📝 Files Modified

1. ✅ `src/core/ai/ExternalProviderAdapter.ts`
   - Added detailed error logging
   - Shows full error object structure

2. ✅ `src/core/external/providers/GoogleGeminiProvider.ts`
   - Added API call logging
   - Shows URL, request body, response status
   - Shows error response body

---

## 🎯 Next Steps

1. **Run the app** with these changes
2. **Send query**: "Search web on elon"
3. **Check logs** for the new detailed output
4. **Share the logs** - they will now show exactly what's wrong!

The logs will reveal:
- Is the API key valid?
- What HTTP status does Gemini return?
- What error message does Gemini provide?
- Is the request format correct?

**This will pinpoint the exact issue!** 🎯
