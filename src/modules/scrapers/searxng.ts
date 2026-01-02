import { ScraperOptions, SearchResult, SearchError, ImageResult } from "../../types";
import { fetchWithDetection, getCacheKey } from "../common";

// Default public SearxNG instances
const DEFAULT_INSTANCES = [
  "https://searx.be",
  "https://searx.space",
  "https://search.mdosch.de",
  "https://searx.work",
  "https://searx.fmac.xyz",
  "https://northboot.xyz",
];

// Cache for search results
const searchCache = new Map<
  string,
  {
    results: SearchResult[];
    timestamp: number;
    source: "searxng";
  }
>();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface SearxNGResultItem {
  title: string;
  url: string;
  content?: string;
  engine?: string;
  score?: number;
  category?: string;
  // Image specific fields
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
}

interface SearxNGResponse {
  query: string;
  number_of_results: number;
  results: SearxNGResultItem[];
  answers?: unknown[];
  corrections?: unknown[];
  infoboxes?: unknown[];
  suggestions?: unknown[];
  unresponsive_engines?: unknown[];
}

export async function searchSearxNG(query: string, options: ScraperOptions = {}): Promise<SearchResult[]> {
  try {
    const mergedOptions: ScraperOptions = {
      limit: 10,
      safeSearch: true,
      timeout: 10000,
      ...options,
    };

    const cacheKey = getCacheKey(query, mergedOptions);
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }

    // Use provided instance or pick a random default
    const instance =
      mergedOptions.searxngInstance || DEFAULT_INSTANCES[Math.floor(Math.random() * DEFAULT_INSTANCES.length)];

    // Construct URL with JSON format
    const searchUrl = new URL(`${instance}/search`);
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("format", "json");
    searchUrl.searchParams.append("safesearch", mergedOptions.safeSearch ? "1" : "0");

    if (mergedOptions.category === "images") {
      searchUrl.searchParams.append("categories", "images");
    }

    try {
      const { body } = await fetchWithDetection(searchUrl.toString(), mergedOptions);
      const data = JSON.parse(body) as SearxNGResponse;

      if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response format from SearxNG");
      }

      if (mergedOptions.category === "images") {
        const results: ImageResult[] = data.results
          .slice(0, mergedOptions.limit)
          .filter((r) => r.img_src || r.thumbnail_src || r.url.match(/\.(jpeg|jpg|gif|png)$/i))
          .map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content || r.title,
            imageUrl: r.img_src || r.url,
            thumbnailUrl: r.thumbnail_src || r.thumbnail || r.img_src || r.url,
            source: "searxng-images",
          }));

        searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
          source: "searxng",
        });

        return results;
      }

      const results: SearchResult[] = data.results.slice(0, mergedOptions.limit).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content || "",
        source: "searxng",
      }));

      searchCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
        source: "searxng",
      });

      return results;
    } catch (error) {
      // If specific error, rethrow
      if (error instanceof Error && error.message.includes("Bot protection")) {
        throw error;
      }
      throw new Error(
        `Failed to fetch from SearxNG instance ${instance}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } catch (error) {
    throw {
      message: "searxng search failed",
      code: "SEARXNG_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}
