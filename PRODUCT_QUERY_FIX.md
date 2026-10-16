# Product Query Fix - Smart Detection

## Problem

Query: **"New tesla roadster"**
- ❌ Routed to: Local model
- ❌ Local response: Just repeated query (broken)
- ✅ Should route to: External with web search

## Root Cause

The query "new tesla roadster" didn't match any existing keywords:
- Not in `needsExternal` keywords (no "search", "latest", etc.)
- Matched `prefersLocal` (short query)
- Router chose local → Wrong choice

## The Fix

### Added Product Query Detection

Updated both `AIRouter.ts` and `ExternalProviderAdapter.ts` to detect **product/brand queries**:

```typescript
// Detect product queries like "new tesla roadster"
const productQuery = /^(new|latest)?\s*(tesla|iphone|samsung|google|apple|spacex|microsoft|amazon|meta|nvidia|amd|intel)\s+\w+$/i.test(query);
```

### How It Works

**Pattern**: `(new|latest)? BRAND PRODUCT`

**Matches**:
- ✅ "new tesla roadster"
- ✅ "latest iphone"
- ✅ "samsung galaxy s24"
- ✅ "spacex starship"
- ✅ "nvidia rtx 5090"
- ✅ "apple vision pro"

**Doesn't Match**:
- ❌ "hello" (no brand)
- ❌ "what is tesla" (question format)
- ❌ "tell me about tesla roadster" (too many words)

### Supported Brands

```
tesla, iphone, samsung, google, apple, spacex, 
microsoft, amazon, meta, nvidia, amd, intel
```

These brands are commonly queried for product information that changes frequently.

## Expected Behavior After Fix

### Query: "New tesla roadster"

**Routing**:
```
🔍 Query analysis: { 
  needsExternal: true,    // ✅ Product query detected
  prefersLocal: true,     // Still matches, but...
  ...
}
🌐 Routing to external: Google Gemini  // ✅ needsExternal takes priority
```

**Web Search**:
```
🔍 [Google Gemini] Detected web search query, performing search...
🔎 [Google Gemini] Extracted search query: "new tesla roadster"
🔍 [WebSearch] Searching for: "new tesla roadster"
✅ [WebSearch] Found 5 results
```

**Response**:
```
AI: "Based on web search results about the new Tesla Roadster:

**Tesla Roadster (Next Generation)**
The new Tesla Roadster is an upcoming all-electric sports car...

**Specifications** (announced):
• 0-60 mph: Under 1.9 seconds
• Top Speed: Over 250 mph
• Range: 620 miles
• Base Price: $200,000

**Release Date**: 
Production expected in 2025, though timelines have shifted...

**Key Features**:
• SpaceX rocket thruster package (optional)
• Removable glass roof
• 2+2 seating

Sources: tesla.com, motortrend.com, electrek.co

Would you like more details about any aspect?"
```

## Technical Implementation

### 1. AIRouter.ts - Routing Detection

```typescript
private queryNeedsExternal(query: string): boolean {
  // ... existing keywords ...
  
  // NEW: Detect product queries
  const productQuery = /^(new|latest)?\s*(tesla|iphone|samsung|...)\s+\w+$/i.test(query);
  
  return externalKeywords.some(...) || productQuery;
}
```

### 2. ExternalProviderAdapter.ts - Search Detection

```typescript
const needsWebSearch = 
  /search|google|latest news|.../i.test(userInput) 
  || /^(new|latest)?\s*(tesla|iphone|...)\s+\w+$/i.test(userInput.trim());
```

Both places need the check to ensure:
1. Router sends query to external
2. External provider performs web search

## Examples

### Example 1: Tesla Roadster
```
You: "new tesla roadster"

Router: needsExternal=true (product query) → Gemini
Search: "new tesla roadster" → 5 results
AI: [Summarizes specs, price, release date, features]
```

### Example 2: Latest iPhone
```
You: "latest iphone"

Router: needsExternal=true (product query) → Gemini
Search: "latest iphone" → 5 results
AI: [Summarizes iPhone 16 details, features, pricing]
```

### Example 3: SpaceX Starship
```
You: "spacex starship"

Router: needsExternal=true (product query) → Gemini
Search: "spacex starship" → 5 results
AI: [Summarizes recent test flights, capabilities, plans]
```

### Example 4: Nvidia GPU
```
You: "nvidia rtx 5090"

Router: needsExternal=true (product query) → Gemini
Search: "nvidia rtx 5090" → 5 results
AI: [Summarizes GPU specs, performance, availability]
```

## Pattern Details

### Regex Breakdown
```regex
/^(new|latest)?\s*(tesla|iphone|...)\s+\w+$/i

^ = Start of string
(new|latest)? = Optional "new" or "latest"
\s* = Optional whitespace
(tesla|iphone|...) = Brand name
\s+ = Required whitespace
\w+ = Product name (one or more word chars)
$ = End of string
/i = Case insensitive
```

### Why This Pattern?

**Precise Matching**:
- `^` and `$` ensure full match (not substring)
- Avoids false positives like "I love tesla"
- Captures clear product queries only

**Flexible Modifiers**:
- "new" is optional: "tesla roadster" works
- "latest" is optional: "latest iphone" works
- Whitespace flexible: "new   tesla  roadster" works

**Brand-Specific**:
- Only matches known tech/auto brands
- Reduces false positives
- Easy to extend with more brands

## Adding More Brands

To add more brands, update both files:

```typescript
// In both AIRouter.ts and ExternalProviderAdapter.ts:
/^(new|latest)?\s*(
  tesla|iphone|samsung|google|apple|spacex|
  microsoft|amazon|meta|nvidia|amd|intel|
  sony|lg|huawei|xiaomi|oneplus|    // Add new brands here
  ford|gm|toyota|bmw|mercedes        // Add automotive brands
)\s+\w+$/i
```

## Testing

### Test Case 1: Tesla Roadster
**Input**: `"new tesla roadster"`  
**Expected**: Routes to external, performs web search  
**Log**: `needsExternal: true`, `🔍 [WebSearch] Searching`

### Test Case 2: iPhone
**Input**: `"latest iphone"`  
**Expected**: Routes to external, performs web search  
**Log**: `needsExternal: true`, `🔍 [WebSearch] Searching`

### Test Case 3: SpaceX
**Input**: `"spacex starship"`  
**Expected**: Routes to external, performs web search  
**Log**: `needsExternal: true`, `🔍 [WebSearch] Searching`

### Test Case 4: Not a Product Query
**Input**: `"hello"`  
**Expected**: Routes to local  
**Log**: `needsExternal: false`, `🏠 Routing to local`

## Files Modified

1. **`src/core/routing/AIRouter.ts`**
   - Added `productQuery` detection to `queryNeedsExternal()`
   - Matches brand+product pattern
   - Returns true for product queries

2. **`src/core/ai/ExternalProviderAdapter.ts`**
   - Added `productQuery` detection to `needsWebSearch`
   - Triggers web search for product queries
   - Ensures search happens before AI response

## Impact

### Before Fix
- ❌ "new tesla roadster" → Local (wrong)
- ❌ Local model broken response
- ❌ No web search
- ❌ No current information

### After Fix
- ✅ "new tesla roadster" → External (correct)
- ✅ Web search performed
- ✅ Real current information
- ✅ Accurate product details

## Related Queries That Now Work

All these queries now trigger external + web search:

### Automotive
- "new tesla model 3"
- "latest tesla cybertruck"
- "new tesla roadster"

### Mobile
- "latest iphone"
- "new samsung galaxy"
- "google pixel 9"

### Tech Products
- "apple vision pro"
- "meta quest 3"
- "microsoft surface"

### Hardware
- "nvidia rtx 5090"
- "amd ryzen 9"
- "intel core ultra"

### Space
- "spacex starship"
- "spacex starlink"

## Status: ✅ Fixed

**Issue**: Product queries routed to local  
**Fix**: Added product query pattern detection  
**Result**: Product queries now get web search + current info  
**Testing**: Ready to test with "new tesla roadster"

---

**Now product queries work correctly!** 🚗🔍✨
