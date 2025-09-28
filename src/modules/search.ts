// search.ts - handles web searching using google, brave n ddg

// Direct import of the search function
const googleSR = require("google-sr");
import {
  SearchOptions,
  SearchResult,
  SearchError,
  SearchProvider,
  ProviderConfig,
} from "../types";

// google-sr types
interface GoogleSearchResponse {
  type: string;
  results: Array<{
    type: string;
    title: string;
    link: string;
    description: string;
  }>;
}
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import * as DDG from "duck-duck-scrape";
import { getWebpageContent } from "./webpage";
import { processHtml } from "../utils/htmlcleaner";

type CheerioElement = ReturnType<typeof cheerio.load> extends (
  selector: any
) => infer R
  ? R
  : never;

// Configuration for HTML parsing
interface SearchSelectorConfig {
  resultContainer: string; // Selector for each result container
  titleSelector?: string; // Selector for title within container
  urlSelector?: string; // Selector for URL within container
  snippetSelector?: string; // Selector for snippet within container
  baseUrl?: string; // Base URL for resolving relative links
  excludeSelectors?: string[]; // Selectors to exclude (e.g. for ads)
  extractors?: {
    // Custom extractors for special cases
    title?: (el: CheerioElement, $: CheerioAPI) => string;
    url?: (el: CheerioElement, $: CheerioAPI) => string;
    snippet?: (el: CheerioElement, $: CheerioAPI) => string;
  };
}

// Parse search results from HTML using provided selectors
function parseSearchResults(
  html: string,
  config: SearchSelectorConfig,
  source: SearchResult["source"]
): SearchResult[] {
  if (!html) {
    throw new Error("No HTML content to parse");
  }

  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(config.resultContainer).each((_, element) => {
    try {
      // Skip if this element matches any exclude selectors
      if (
        config.excludeSelectors?.some((selector) => $(element).is(selector))
      ) {
        return;
      }

      let title: string | undefined;
      let url: string | undefined;
      let snippet: string | undefined;

      // Extract title
      if (config.extractors?.title) {
        title = config.extractors.title($(element), $);
      } else if (config.titleSelector) {
        title = $(element).find(config.titleSelector).text().trim();
      }

      // Extract URL
      if (config.extractors?.url) {
        url = config.extractors.url($(element), $);
      } else if (config.urlSelector) {
        url = $(element).find(config.urlSelector).attr("href")?.trim();
      }

      // Extract snippet
      if (config.extractors?.snippet) {
        snippet = config.extractors.snippet($(element), $);
      } else if (config.snippetSelector) {
        snippet = $(element).find(config.snippetSelector).text().trim();
      }

      // Validate and format URL
      if (url && title) {
        try {
          const fullUrl = config.baseUrl
            ? new URL(url, config.baseUrl).toString()
            : url;
          results.push({
            title,
            url: fullUrl,
            snippet: snippet || undefined,
            source,
          });
        } catch (err) {
          console.warn(`Invalid URL "${url}" in search result:`, err);
        }
      }
    } catch (err) {
      console.warn("Failed to parse search result:", err);
    }
  });

  return results;
}

// Parse Brave results using the new utility
function parseBraveResults(html: string): SearchResult[] {
  // Configuration for regular results
  const regularConfig: SearchSelectorConfig = {
    resultContainer: "div > a[href]:not(details a)",
    titleSelector: "span",
    urlSelector: "href",
    snippetSelector: "+ div",
    baseUrl: "https://search.brave.com",
    excludeSelectors: [
      "div#search-ad",
      "div[data-placement-id]",
      'div.snippet:has(button.alabel > span:contains("Sponsored"))',
    ],
    extractors: {
      title: (el, $) => $(el).find("span").text().trim() || $(el).text().trim(),
      url: (el, $) => $(el).attr("href")?.trim() || "",
      snippet: (el, $) => $(el).next("div").text().trim(),
    },
  };

  // Configuration for discussion results
  const discussionConfig: SearchSelectorConfig = {
    resultContainer: "details",
    titleSelector: "summary p[title]",
    urlSelector: "div > a:last-child",
    snippetSelector: "div:first-child",
    baseUrl: "https://search.brave.com",
    extractors: {
      title: (el, $) => {
        const block = $(el);
        const summary = block.find("summary");
        const titleElement = summary.find("p[title]");
        return titleElement.attr("title")?.trim() || summary.text().trim();
      },
    },
  };

  // Combine results from both configurations
  return [
    ...parseSearchResults(html, regularConfig, SearchProvider.Brave),
    ...parseSearchResults(html, discussionConfig, SearchProvider.Brave),
  ];
}

// Parse Ecosia search results
function parseEcosiaResults(html: string): SearchResult[] {
  // Remove any ad containers first since they're siblings to organic results
  const $ = cheerio.load(html);
  $(
    'div[data-test-id="mainline-result-ad"], div[data-test-id="ad-google"]'
  ).remove();

  const config: SearchSelectorConfig = {
    resultContainer: 'article[data-test-id="organic-result"]',
    titleSelector: 'h2[data-test-id="result-title"]',
    urlSelector: 'a[data-test-id="result-link"]',
    snippetSelector: 'p[data-test-id="web-result-description"]',
    baseUrl: "https://www.ecosia.org",
  };

  return parseSearchResults(html, config, SearchProvider.Ecosia);
}

// Ecosia search helper
async function searchEcosia(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
  });

  const searchUrl = `https://www.ecosia.org/search?${params.toString()}`;
  console.log("\nEcosia Search:");
  console.log("URL:", searchUrl);

  try {
    console.log("Fetching webpage content...");
    const content = await getWebpageContent(searchUrl);

    if (!content.content) {
      console.log("❌ No HTML content received");
      throw new Error("No HTML content received from webpage");
    }
    console.log("✅ Got HTML content, length:", content.content.length);

    console.log("Processing HTML...");
    const html = processHtml(content.content, searchUrl);

    if (!html) {
      console.log("❌ HTML processing failed");
      throw new Error("Failed to process HTML content");
    }
    console.log("✅ HTML processed successfully");

    console.log("Parsing search results...");
    const $ = cheerio.load(html);
    const adCount = $(
      'div[data-test-id="mainline-result-ad"], div[data-test-id="ad-google"]'
    ).length;
    const resultCount = $('article[data-test-id="organic-result"]').length;
    console.log(
      `Found ${adCount} ads and ${resultCount} organic result containers before filtering`
    );

    const results = parseEcosiaResults(html);
    console.log(
      `✅ Parsed ${results.length} valid results with titles and URLs`
    );

    return results.slice(0, options.limit || defaultOptions.limit);
  } catch (error) {
    throw {
      message: `Ecosia search failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      code: "ECOSIA_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

const defaultOptions: SearchOptions = {
  limit: 10,
  safeSearch: true,
  timeout: 10000,
  provider: SearchProvider.Google,
};

// List of providers and their current status
export const SEARCH_PROVIDERS: Record<SearchProvider, ProviderConfig> = {
  [SearchProvider.Google]: { enabled: true, name: "Google" },
  [SearchProvider.Brave]: { enabled: true, name: "Brave" },
  [SearchProvider.DuckDuckGo]: { enabled: true, name: "DuckDuckGo" },
  [SearchProvider.Ecosia]: {
    enabled: false,
    name: "Ecosia",
    experimental: true,
  },
  [SearchProvider.SearXNG]: {
    enabled: true,
    name: "SearXNG",
    experimental: false,
  },
};

// Provider status configuration notes:
// - Google: Primary provider with Brave fallback
// - Brave: Reliable alternative with good parsing
// - DuckDuckGo: Rate limited but functional
// - Ecosia: Disabled by default due to strict bot detection (403 errors)
//   Would require browser automation (e.g. Puppeteer) to work reliably
// - SearXNG: Metasearch engine with JSON API, requires baseUrl configuration
//   Public instances available at https://searx.space/

// DuckDuckGo search helper
async function searchDuckDuckGo(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  try {
    console.log("Using DuckDuckGo search provider...");
    const results = await DDG.search(query, {
      safeSearch: options.safeSearch
        ? DDG.SafeSearchType.STRICT
        : DDG.SafeSearchType.OFF,
    });

    if (results.noResults) {
      return [];
    }

    const formattedResults = results.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: SearchProvider.DuckDuckGo,
    }));

    console.log(`Found ${formattedResults.length} DuckDuckGo results`);
    return formattedResults.slice(0, options.limit || defaultOptions.limit);
  } catch (error) {
    throw {
      message: `DuckDuckGo search failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      code: "DDG_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// Brave search helper
async function searchBrave(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    summary: "0",
    safesearch: options.safeSearch ? "strict" : "off",
  });

  const searchUrl = `https://search.brave.com/search?${params.toString()}`;
  console.log("Search URL:", searchUrl);

  try {
    console.log("Fetching Brave search results...");
    const content = await getWebpageContent(searchUrl);

    if (!content.content) {
      throw new Error("No HTML content received from webpage");
    }

    const html = processHtml(content.content, searchUrl);

    if (!html) {
      throw new Error("Failed to process HTML content");
    }

    console.log("Parsing search results...");
    const results = parseBraveResults(html);
    console.log(`Found ${results.length} raw results`);

    return results.slice(0, options.limit || defaultOptions.limit);
  } catch (error) {
    throw {
      message: `Brave search failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      code: "BRAVE_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// Rate limiting parameters
const RATE_LIMITS = {
  google: 1000, // 1 second between searches
  brave: 1000, // 1 second between searches
  duckduckgo: 5000, // 5 seconds between searches (DDG is very strict)
  ecosia: 1000, // 1 second between searches
  searxng: 500, // 0.5 seconds between searches
};

const lastSearchTimes = {
  google: 0,
  brave: 0,
  duckduckgo: 0,
  ecosia: 0,
  searxng: 0,
};

// Cache for search results
const searchCache = new Map<
  string,
  {
    results: SearchResult[];
    timestamp: number;
  }
>();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Helper function to enforce rate limiting
async function enforceRateLimit(provider: SearchOptions["provider"]) {
  const providerName = provider || "google";
  const now = Date.now();
  const delay = RATE_LIMITS[providerName];
  const lastTime = lastSearchTimes[providerName] || 0;
  const timeSinceLastSearch = now - lastTime;

  if (timeSinceLastSearch < delay) {
    await new Promise((resolve) =>
      setTimeout(resolve, delay - timeSinceLastSearch)
    );
  }

  lastSearchTimes[providerName] = Date.now();
}

// SearXNG search helper
async function searchSearXNG(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  if (!options.searxngConfig?.baseUrl) {
    throw new Error("SearXNG base URL is required in searxngConfig.baseUrl");
  }

  const params = new URLSearchParams({
    q: query,
    format: "json",
    safesearch: options.safeSearch ? "2" : "0",
    ...(options.limit && { pageno: "1" }),
  });

  const searchUrl = `${options.searxngConfig.baseUrl.replace(/\/$/, "")}/search?${params.toString()}`;
  console.log("\nSearXNG Search:");
  console.log("URL:", searchUrl);

  try {
    const headers: Record<string, string> = {
      "User-Agent": "llm-search/1.0.0",
      "Accept": "application/json",
    };

    if (options.searxngConfig.apiKey) {
      headers["Authorization"] = `Bearer ${options.searxngConfig.apiKey}`;
    }

    console.log("Fetching SearXNG results...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
    
    const response = await fetch(searchUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`SearXNG API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Got SearXNG response with ${data.results?.length || 0} results`);

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    const results: SearchResult[] = data.results
      .filter((item: any) => item.title && item.url)
      .map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.content || item.description || undefined,
        source: SearchProvider.SearXNG,
      }))
      .slice(0, options.limit || 10);

    console.log(`✅ Parsed ${results.length} valid SearXNG results`);
    return results;
  } catch (error) {
    throw {
      message: `SearXNG search failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      code: "SEARXNG_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// Helper function to get cache key
function getCacheKey(query: string, options: SearchOptions): string {
  return `${query}-${JSON.stringify({
    ...options,
    provider: options.provider || "google",
  })}`;
}

// Main search function
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  try {
    const opts = { ...defaultOptions, ...options };

    // Validate provider
    const provider = opts.provider || "google";
    const providerConfig =
      SEARCH_PROVIDERS[provider as keyof typeof SEARCH_PROVIDERS];

    if (!providerConfig) {
      throw new Error(`Unknown search provider: ${provider}`);
    }

    if (!providerConfig.enabled) {
      throw new Error(
        `Search provider ${providerConfig.name} is currently disabled` +
          (providerConfig.experimental ? " (experimental feature)" : "")
      );
    }

    const cacheKey = getCacheKey(query, opts);
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }

    await enforceRateLimit(opts.provider);
    let results: SearchResult[] = [];

    // select search provider
    switch (provider) {
      case "brave":
        results = await searchBrave(query, opts);
        break;

      case "duckduckgo":
        results = await searchDuckDuckGo(query, opts);
        break;

      case "ecosia":
        results = await searchEcosia(query, opts);
        break;

      case "searxng":
        results = await searchSearXNG(query, opts);
        break;

      default: // google
        console.log("Using Google search...");
        try {
          // Call search function with basic options
          const response = await googleSR(query, {
            safeMode: opts.safeSearch ? "active" : false,
            page: false,
          });

          if (!response?.searchResults?.length) {
            console.warn(
              "No Google results found, falling back to Brave search"
            );
            results = await searchBrave(query, opts);
          } else {
            results = response.searchResults
              .map((item) => ({
                title: item.title || "",
                url: item.link || "",
                snippet: item.description || "",
                source: SearchProvider.Google,
              }))
              .slice(0, opts.limit || 10);
            console.log(`Found ${results.length} Google results`);
          }
        } catch (err: unknown) {
          console.warn("Google search failed with error:", err);

          // Type guard for network errors
          type NetworkError = { code: string };
          const isNetworkError = (e: unknown): e is NetworkError =>
            typeof e === "object" && e !== null && "code" in e;

          if (
            isNetworkError(err) &&
            (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT")
          ) {
            console.warn(
              "Network error during Google search, falling back to Brave search"
            );
            results = await searchBrave(query, opts);
          } else {
            // For other errors, throw with details
            throw {
              message: `Google search failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
              code: "GOOGLE_SEARCH_ERROR",
              originalError: err,
            } as SearchError;
          }
        }
        break;
    }

    // cache results
    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    return results;
  } catch (error) {
    throw {
      message: `Search failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      code: "SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}
