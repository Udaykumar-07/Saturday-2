/**
 * Search Configuration
 * 
 * DUCKDUCKGO ONLY (Recommended for MVP and Production):
 * - Google deprecated free "Search the entire web" feature
 * - Google Custom Search now ONLY searches specific sites (max 50 domains)
 * - DuckDuckGo remains the best option: unlimited, free, searches actual web
 * 
 * For paid Google Programmable Search ($5/1000 queries), see:
 * https://developers.google.com/custom-search/v1/overview
 */

export const searchConfig = {
  // Google Custom Search deprecated free web-wide search
  // Only specific domains can be searched (not useful for general AI)
  google: {
    enabled: false, // Deprecated feature, not recommended
    searchEngineId: '', // Leave empty
  },
  
  // DuckDuckGo is the recommended search provider
  duckduckgo: {
    enabled: true, // Free, unlimited, searches entire web
  },
};
