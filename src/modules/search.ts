import { ScraperOptions, SearchResult } from "../types";
import { searchGoogle } from "./scrapers/google";
import { searchDuckDuckGo } from "./scrapers/duckduckgo";
import { searchSearxNG } from "./scrapers/searxng";

// Re-export specific search functions
export { searchGoogle } from "./scrapers/google";
export { searchDuckDuckGo } from "./scrapers/duckduckgo";
export { searchSearxNG } from "./scrapers/searxng";

// Unified search that tries engines in sequence: DuckDuckGo -> Google -> SearxNG
export async function search(query: string, options: ScraperOptions = {}): Promise<SearchResult[]> {
  const errors: unknown[] = [];

  // 1. Try DuckDuckGo first (most lenient)
  try {
    return await searchDuckDuckGo(query, options);
  } catch (err) {
    console.warn("DuckDuckGo search failed, falling back to Google...", err instanceof Error ? err.message : String(err));
    errors.push(err);
  }

  // 2. Try Google (best quality, but strict bot detection)
  try {
    return await searchGoogle(query, options);
  } catch (err) {
    console.warn("Google search failed, falling back to SearxNG...", err instanceof Error ? err.message : String(err));
    errors.push(err);
  }

  // 3. Try SearxNG (fallback to public instances)
  try {
    return await searchSearxNG(query, options);
  } catch (err) {
    console.warn("SearxNG search failed", err instanceof Error ? err.message : String(err));
    errors.push(err);
  }

  // If all failed, throw error with details
  throw {
    message: "All search engines failed",
    code: "ALL_SEARCH_ENGINES_FAILED",
    errors,
  };
}
