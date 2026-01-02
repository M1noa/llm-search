import googleNewsScraper, { GoogleNewsArticle } from "google-news-scraper";
import { ScraperOptions, NewsResult, SearchError } from "../../types";
import { getCacheKey } from "../common";

// Cache for news results
const newsCache = new Map<
  string,
  {
    results: NewsResult[];
    timestamp: number;
    source: "google-news";
  }
>();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for news

export async function searchGoogleNews(query: string, options: ScraperOptions = {}): Promise<NewsResult[]> {
  try {
    const mergedOptions: ScraperOptions = {
      limit: 10,
      safeSearch: true,
      timeout: 10000,
      ...options,
    };

    const cacheKey = getCacheKey(query, mergedOptions);
    const cached = newsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }

    // google-news-scraper uses Puppeteer internally
    const articles: GoogleNewsArticle[] = await googleNewsScraper({
      searchTerm: query,
      prettyURLs: true,
      queryVars: {
        hl: "en-US",
        gl: "US",
        ceid: "US:en",
      },
    });

    const results: NewsResult[] = articles.slice(0, mergedOptions.limit).map((article) => ({
      title: article.title,
      url: article.link,
      snippet: article.subtitle || "",
      source: "google-news",
      sourceName: article.source,
      imageUrl: article.image,
      publishedAt: article.time,
    }));

    if (results.length > 0) {
      newsCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
        source: "google-news",
      });
    }

    return results;
  } catch (error) {
    throw {
      message: "google news search failed",
      code: "GOOGLE_NEWS_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}
