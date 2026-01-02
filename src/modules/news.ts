import { ScraperOptions, NewsResult } from "../types";
import { searchGoogleNews } from "./scrapers/google-news";
import { searchDuckDuckGo } from "./scrapers/duckduckgo";

// Re-export specific news search functions
export { searchGoogleNews } from "./scrapers/google-news";

// Unified news search that tries engines in sequence: Google News -> DuckDuckGo News
export async function searchNews(query: string, options: ScraperOptions = {}): Promise<NewsResult[]> {
  const errors: unknown[] = [];

  // 1. Try Google News first (specialized news scraper)
  try {
    return await searchGoogleNews(query, options);
  } catch (err) {
    errors.push(err);
  }

  // 2. Try DuckDuckGo with news category
  try {
    const ddgOptions = { ...options, category: "news" as const };
    const results = await searchDuckDuckGo(query, ddgOptions);

    // Convert generic SearchResult to NewsResult
    return results.map((result) => ({
      ...result,
      source: "duckduckgo-news",
    }));
  } catch (err) {
    errors.push(err);
  }

  // If all failed, throw error with details
  throw {
    message: "All news search engines failed",
    code: "ALL_NEWS_ENGINES_FAILED",
    errors,
  };
}
