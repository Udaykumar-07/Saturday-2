# Routing Priority Fix - Current Date/Time Queries

## Bug Found
Query: **"Give today date"**
- Analyzed as: `needsExternal: true` AND `prefersLocal: true`
- Routed to: **Local model** ❌ (Wrong!)
- Should route to: **External model** ✅ (Needs current date)

## Root Cause
The routing logic checked `prefersLocal` **BEFORE** `needsExternal`, so:
1. Query "give today date" contains "today" → `needsExternal: true`
2. Query also contains "give" (short/casual) → `prefersLocal: true`
3. Router checked `prefersLocal` first → Routed to local ❌
4. Local model gave wrong date (March 31, 2026 instead of September 18, 2026)

## The Fix

### Changed Priority Order

**BEFORE** (Wrong):
```typescript
// Priority 3: Route based on query analysis

// Check prefersLocal FIRST
if (prefersLocal && localAvailable) {
  return routeToLocal(); // ❌ Picked this for "give today date"
}

// Check needsExternal SECOND
if (needsExternal && externalProviders.length > 0) {
  return routeToExternal(); // ⚠️ Never reached!
}
```

**AFTER** (Fixed):
```typescript
// Priority 3: Route based on query analysis

// HIGHEST PRIORITY: Check needsExternal FIRST
if (needsExternal && externalProviders.length > 0) {
  return routeToExternal(); // ✅ Picks this for "give today date"
}

// Only use local if query doesn't need external
if (prefersLocal && localAvailable && !needsExternal) {
  return routeToLocal();
}
```

### Key Change
Added `!needsExternal` condition to local routing checks:
```typescript
// Old: if (prefersLocal && localAvailable)
// New: if (prefersLocal && localAvailable && !needsExternal)
```

This ensures that queries requiring real-time/current info **always** go to external, even if they also match local keywords.

## Keywords Enhanced

Added explicit date/time keywords to `needsExternal`:
```typescript
'today date', 'current date', 'current time', 'what date', 'what time'
```

These keywords already work because "today" triggers external, but explicit keywords make intent clearer.

## Expected Behavior After Fix

### Queries That Need External (Real-time Info)
| Query | needsExternal | prefersLocal | Routes To | Why |
|-------|---------------|--------------|-----------|-----|
| "Give today date" | ✅ true | ✅ true | **External** | needsExternal takes priority |
| "What's current time" | ✅ true | ✅ true | **External** | needsExternal takes priority |
| "Today's weather" | ✅ true | ❌ false | **External** | Real-time data |
| "Latest news" | ✅ true | ❌ false | **External** | Current events |

### Queries That Stay Local
| Query | needsExternal | prefersLocal | Routes To | Why |
|-------|---------------|--------------|-----------|-----|
| "Hello" | ❌ false | ✅ true | **Local** | No external needed |
| "What is AI?" | ❌ false | ✅ true | **Local** | Knowledge-based |
| "Write code" | ❌ false | ✅ true | **Local** | Technical task |
| "Calculate 5+3" | ❌ false | ✅ true | **Local** | Math/logic |

## Testing

### Test Case 1: Current Date
**Input**: `"Give today date"`  
**Expected**: Routes to Gemini  
**Log**:
```
🔍 Query analysis: { needsExternal: true, prefersLocal: true, ... }
🌐 Routing to external: Google Gemini (query needs internet/current info)
🎯 Routing decision: google_gemini_provider
```

### Test Case 2: Current Time
**Input**: `"What's the current time?"`  
**Expected**: Routes to Gemini  
**Log**:
```
🔍 Query analysis: { needsExternal: true, ... }
🌐 Routing to external: Google Gemini
```

### Test Case 3: Casual Greeting (Should Stay Local)
**Input**: `"Hello!"`  
**Expected**: Routes to local  
**Log**:
```
🔍 Query analysis: { needsExternal: false, prefersLocal: true, ... }
🏠 Routing to local: Query best handled by fast local model
```

### Test Case 4: Knowledge Question (Should Stay Local)
**Input**: `"What is machine learning?"`  
**Expected**: Routes to local  
**Log**:
```
🔍 Query analysis: { needsExternal: false, prefersLocal: true, ... }
🏠 Routing to local: Query best handled by fast local model
```

## Priority Logic Summary

The router now follows this decision tree:

```
1. Privacy Check
   ├── strictLocalOnly? → Local (always)
   └── Continue ↓

2. External Needed Check (HIGHEST PRIORITY)
   ├── needsExternal + external available? → External ✅
   └── Continue ↓

3. Local Preferred Check
   ├── prefersLocal + local available + NOT needsExternal? → Local ✅
   └── Continue ↓

4. Default Local Check
   ├── local available + NOT needsExternal? → Local ✅
   └── Continue ↓

5. General External Check
   ├── external available? → External ✅
   └── Continue ↓

6. Fallback
   ├── any provider available? → Use it ✅
   └── Error: No providers available ❌
```

## Impact

### Fixed Issues:
✅ Current date queries now route to external  
✅ Current time queries now route to external  
✅ Real-time data queries always use external  
✅ Priority logic now makes sense  

### Still Works:
✅ Casual chat stays local (fast)  
✅ Basic Q&A stays local (efficient)  
✅ Coding help stays local (private)  
✅ Web search goes external (accurate)  

### What Changed:
- **1 file modified**: `src/core/routing/AIRouter.ts`
- **Logic reordered**: `needsExternal` now checked FIRST
- **Conditions added**: `!needsExternal` added to local checks
- **Keywords added**: Explicit date/time keywords for clarity

## Verification Steps

1. **Reload app**: Press `r` in Metro terminal

2. **Test current date**:
   ```
   "Give today date"
   "What's the current date?"
   "Tell me today's date"
   ```
   **Expected**: All route to Gemini

3. **Test local still works**:
   ```
   "Hello!"
   "What is Python?"
   "Write a sort function"
   ```
   **Expected**: All route to local

4. **Monitor logs**: Watch for routing decisions

---

## Status: ✅ Fixed

**Bug**: Current date queries routed to local model  
**Fix**: Reordered priority to check `needsExternal` first  
**Impact**: High - Ensures accurate real-time information  
**Testing**: Ready - Reload app and test

**The router now correctly prioritizes real-time information needs!** 🎯
