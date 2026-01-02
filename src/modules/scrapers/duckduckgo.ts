import { ScraperOptions, SearchResult, SearchError, ImageResult } from "../../types";
import {
  parseProxyConfig,
  createStealthBrowser,
  fetchWithDetection,
  createRealisticHeaders,
  getCacheKey,
  cleanText,
} from "../common";
import { JSDOM } from "jsdom";

/**
 * Extracts the "Answer Box" or "Instant Answer" from the DuckDuckGo Search DOM
 */
export function extractAnswerBox(doc: Document): string | undefined {
  // 1. Abstract / Wikipedia Snippet - .module__text
  const abstract = doc.querySelector(".module__text");
  if (abstract && abstract.textContent) {
    return abstract.textContent.trim();
  }

  // 2. Definition / Answer - .zci__def__text
  const definition = doc.querySelector(".zci__def__text");
  if (definition && definition.textContent) {
    return definition.textContent.trim();
  }

  // 3. Calculator / Unit Converter - .c-base__title
  const calculator = doc.querySelector(".c-base__title");
  if (calculator && calculator.textContent) {
    return calculator.textContent.trim();
  }

  // 4. Generic Fact - .zci__body
  const fact = doc.querySelector(".zci__body");
  if (fact && fact.textContent) {
    return fact.textContent.trim();
  }

  return undefined;
}

// Rate limiting parameters
const MIN_DELAY_BETWEEN_SEARCHES = 2000;
let lastDDGSearchTime = 0;

// Cache for search results
const searchCache = new Map<
  string,
  {
    results: SearchResult[];
    timestamp: number;
    source: "duckduckgo";
  }
>();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Helper function to enforce rate limiting
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastSearch = now - lastDDGSearchTime;

  if (timeSinceLastSearch < MIN_DELAY_BETWEEN_SEARCHES) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_BETWEEN_SEARCHES - timeSinceLastSearch));
  }
  lastDDGSearchTime = Date.now();
}

/**
 * Extract the direct URL from a DuckDuckGo redirect URL
 */
function extractDirectUrl(duckduckgoUrl: string): string {
  try {
    let urlStr = duckduckgoUrl;

    // Handle relative URLs from DuckDuckGo
    if (urlStr.startsWith("//")) {
      urlStr = "https:" + urlStr;
    } else if (urlStr.startsWith("/")) {
      urlStr = "https://duckduckgo.com" + urlStr;
    }

    const url = new URL(urlStr);

    // Extract direct URL from DuckDuckGo redirect
    if (url.hostname === "duckduckgo.com" && url.pathname === "/l/") {
      const uddg = url.searchParams.get("uddg");
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    }

    // Handle ad redirects
    if (url.hostname === "duckduckgo.com" && url.pathname === "/y.js") {
      const u3 = url.searchParams.get("u3");
      if (u3) {
        try {
          const decodedU3 = decodeURIComponent(u3);
          const u3Url = new URL(decodedU3);
          const clickUrl = u3Url.searchParams.get("ld");
          if (clickUrl) {
            return decodeURIComponent(clickUrl);
          }
          return decodedU3;
        } catch {
          return urlStr;
        }
      }
    }

    return urlStr;
  } catch {
    // If URL parsing fails, try to extract URL from a basic string match
    const urlMatch = duckduckgoUrl.match(/https?:\/\/[^\s<>"]+/);
    if (urlMatch) {
      return urlMatch[0];
    }
    return duckduckgoUrl;
  }
}

/**
 * Generate a Jina AI URL for a given website URL
 */
function getJinaAiUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://r.jina.ai/${urlObj.href}`;
  } catch {
    return "";
  }
}

// Search using Puppeteer
async function searchWithPuppeteer(query: string, options: ScraperOptions): Promise<SearchResult[]> {
  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);
  const page = await browser.newPage();

  try {
    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    if (options.category === "images") {
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
      await page.goto(searchUrl, { waitUntil: "networkidle2" });

      // Wait for image results - DDG images usually loaded in tiles
      try {
        await page.waitForSelector(".tile--img", { timeout: 10000 });
      } catch (e) {
        // continue
      }

      const results = await page.evaluate((limit) => {
        const items: ImageResult[] = [];
        const elements = document.querySelectorAll(".tile--img");

        for (let i = 0; i < Math.min(elements.length, limit || 20); i++) {
          const el = elements[i];

          // Title
          const titleEl = el.querySelector(".tile__title");
          const title = titleEl?.textContent || "Image";

          // Source link
          const linkEl = el.querySelector("a.tile--img__sub");
          const url = (linkEl as HTMLAnchorElement)?.href || "";

          // Thumbnail/Image
          const imgEl = el.querySelector("img.tile--img__img");
          const imageUrl = (imgEl as HTMLImageElement)?.src || imgEl?.getAttribute("data-src") || "";

          if (url && imageUrl) {
            items.push({
              title,
              url,
              snippet: title,
              imageUrl: imageUrl,
              thumbnailUrl: imageUrl,
              source: "duckduckgo-images",
            });
          }
        }

        return items;
      }, options.limit);

      return results;
    }

    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector("#links .result", { timeout: 10000 });

    const results = await page.evaluate((limit) => {
      const items: SearchResult[] = [];
      const elements = document.querySelectorAll("#links .result");

      for (let i = 0; i < Math.min(elements.length, limit || 10); i++) {
        const el = elements[i];
        const titleEl = el.querySelector("h2");
        const linkEl = el.querySelector("a");
        const snippetEl = el.querySelector(".result__snippet");

        if (titleEl && linkEl) {
          items.push({
            title: titleEl.textContent || "",
            url: (linkEl as HTMLAnchorElement).href || "",
            snippet: snippetEl?.textContent || "",
            source: "duckduckgo",
          });
        }
      }

      return items;
    }, options.limit);

    return results;
  } finally {
    await browser.close();
  }
}

export async function searchDuckDuckGo(query: string, options: ScraperOptions = {}): Promise<SearchResult[]> {
  try {
    const mergedOptions: ScraperOptions = {
      limit: 10,
      safeSearch: true,
      timeout: 10000,
      forcePuppeteer: false,
      antiBot: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 2000,
      },
      ...options,
    };

    const cacheKey = getCacheKey(query, mergedOptions);
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }

    await enforceRateLimit();

    // Try HTML scraping first unless Puppeteer is forced or we are searching for images (images require JS/Puppeteer)
    if (!mergedOptions.forcePuppeteer && mergedOptions.category !== "images") {
      try {
        let searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        if (mergedOptions.category === "news") {
          searchUrl += "&iar=news&ia=news";
        }

        const { body } = await fetchWithDetection(searchUrl, mergedOptions);

        const dom = new JSDOM(body);
        const doc = dom.window.document;
        const elements = doc.querySelectorAll(".result");

        const results: SearchResult[] = [];

        // Use a simple loop with index to respect limit
        for (let i = 0; i < elements.length && results.length < (mergedOptions.limit || 10); i++) {
          const el = elements[i];
          const titleEl = el.querySelector(".result__title a");
          const linkEl = el.querySelector(".result__url"); // Usually just display URL
          const snippetEl = el.querySelector(".result__snippet");

          // Try to extract date/source for news if available (structure might vary in HTML version)
          // For now, basic extraction works for both

          if (titleEl) {
            const rawLink = titleEl.getAttribute("href");
            const title = titleEl.textContent?.trim() || "";
            const snippet = snippetEl?.textContent?.trim() || "";

            if (rawLink && title) {
              const url = extractDirectUrl(rawLink);

              if (url && url.startsWith("http")) {
                results.push({
                  title,
                  url,
                  snippet,
                  source: mergedOptions.category === "news" ? "duckduckgo-news" : "duckduckgo",
                });
              }
            }
          }
        }

        if (results.length > 0) {
          searchCache.set(cacheKey, {
            results,
            timestamp: Date.now(),
            source: "duckduckgo",
          });
          return results;
        }

        // If no results found via HTML, might be blocked or empty, try puppeteer?
        // Or if it was a genuine empty result.
        // Let's assume if 0 results in HTML but page loaded, we might try puppeteer as backup
        // if we suspect bot detection, but if fetchWithDetection didn't throw, maybe it's just no results.
        // However, DDG HTML version sometimes gives 0 results for complex queries where JS version works.
        // So fallback is good.
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === "Bot protection detected" && mergedOptions.antiBot?.enabled) {
          // Silent fallback
        } else {
          // Silent fallback
        }
      }
    }

    // Use Puppeteer as fallback
    const results = await searchWithPuppeteer(query, mergedOptions);

    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      source: "duckduckgo",
    });

    return results;
  } catch (error) {
    throw {
      message: "duckduckgo search failed :/",
      code: "DDG_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}
