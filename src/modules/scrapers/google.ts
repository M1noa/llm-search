import { search as googleSearch, OrganicResult, type OrganicResultNode } from "google-sr";
import { ScraperOptions, SearchResult, SearchError, ImageResult } from "../../types";
import {
  parseProxyConfig,
  createStealthBrowser,
  fetchWithDetection,
  createRealisticHeaders,
  getCacheKey,
} from "../common";

/**
 * Extracts the "Answer Box" or "Featured Snippet" from the Google Search DOM
 */
export function extractAnswerBox(doc: Document): string | undefined {
  // 1. Featured Snippet (Text) - .hgKElc
  const featuredSnippet = doc.querySelector(".hgKElc");
  if (featuredSnippet && featuredSnippet.textContent) {
    return featuredSnippet.textContent.trim();
  }

  // 2. Featured Snippet (List) - .LGOjhe
  const listSnippet = doc.querySelector(".LGOjhe");
  if (listSnippet && listSnippet.textContent) {
    return listSnippet.textContent.trim();
  }

  // 3. Direct Answer (e.g., calculations, dates) - .Z0LcW
  const directAnswer = doc.querySelector(".Z0LcW");
  if (directAnswer && directAnswer.textContent) {
    return directAnswer.textContent.trim();
  }

  // 4. Knowledge Panel Description - .kno-rdesc span
  const knowledgePanel = doc.querySelector(".kno-rdesc span");
  if (knowledgePanel && knowledgePanel.textContent) {
    return knowledgePanel.textContent.trim();
  }

  // 5. Dictionary Definition - div[data-attrid="description"]
  const definition = doc.querySelector("div[data-attrid='description']");
  if (definition && definition.textContent) {
    return definition.textContent.trim();
  }

  return undefined;
}

// Rate limiting parameters
const GOOGLE_DELAY = 2000; // 2 seconds for Google
let lastGoogleSearchTime = 0;

// Cache for search results
const searchCache = new Map<
  string,
  {
    results: SearchResult[];
    timestamp: number;
    source: "google";
  }
>();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Helper function to enforce rate limiting
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastSearch = now - lastGoogleSearchTime;

  if (timeSinceLastSearch < GOOGLE_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, GOOGLE_DELAY - timeSinceLastSearch));
  }
  lastGoogleSearchTime = Date.now();
}

// Search using Puppeteer
async function searchWithPuppeteer(query: string, options: ScraperOptions): Promise<SearchResult[]> {
  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);
  const page = await browser.newPage();

  try {
    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set extra headers
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    if (options.category === "images") {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
      await page.goto(searchUrl, { waitUntil: "networkidle2" });

      // Wait for image results
      // Google images usually have div.isv-r or specific containers
      try {
        await page.waitForSelector("div[data-id], div.isv-r", { timeout: 10000 });
      } catch (e) {
        // continue, might be empty
      }

      const results = await page.evaluate((limit) => {
        const items: ImageResult[] = [];
        // Select image containers
        const elements = document.querySelectorAll("div[data-id], div.isv-r");

        for (let i = 0; i < Math.min(elements.length, limit || 20); i++) {
          const el = elements[i];

          // Title often in h3 or aria-label
          const titleEl = el.querySelector("h3") || el.querySelector("[title]");
          const title = titleEl?.textContent || titleEl?.getAttribute("title") || "Image";

          // Source link (page containing image)
          const linkEl = el.querySelector("a");
          const url = (linkEl as HTMLAnchorElement)?.href || "";

          // Thumbnail
          const imgEl = el.querySelector("img");
          const thumbnailUrl = imgEl?.src || imgEl?.getAttribute("data-src") || "";

          // Full image URL is hard to get without clicking.
          // Sometimes it's in a JSON blob in the page, but that's brittle.
          // We will use the thumbnail as a fallback for imageUrl if we can't find better.
          // For now, let's just use the thumbnail.

          if (url && thumbnailUrl) {
            items.push({
              title,
              url, // This is the source page URL
              snippet: title,
              imageUrl: thumbnailUrl, // Using thumbnail as image URL for now due to complexity
              thumbnailUrl,
              source: "google-images",
            });
          }
        }
        return items;
      }, options.limit);

      return results;
    }

    // Default Web Search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    // Wait for results
    await page.waitForSelector("div.g", { timeout: 10000 });

    // Extract results
    const results = await page.evaluate((limit) => {
      const items: SearchResult[] = [];
      const elements = document.querySelectorAll("div.g");

      for (let i = 0; i < Math.min(elements.length, limit || 10); i++) {
        const el = elements[i];
        const titleEl = el.querySelector("h3");
        const linkEl = el.querySelector("a");
        const snippetEl = el.querySelector(".VwiC3b");

        if (titleEl && linkEl) {
          items.push({
            title: titleEl.textContent || "",
            url: (linkEl as HTMLAnchorElement).href || "",
            snippet: snippetEl?.textContent || "",
            source: "google",
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

export async function searchGoogle(query: string, options: ScraperOptions = {}): Promise<SearchResult[]> {
  try {
    // Clone and merge options
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

    // Try basic fetch first unless Puppeteer is forced or we are searching for images
    if (!mergedOptions.forcePuppeteer && mergedOptions.category !== "images") {
      try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await fetchWithDetection(searchUrl, mergedOptions);

        // If no bot detection, use library
        const results: OrganicResultNode[] = await googleSearch({
          query,
          parsers: [OrganicResult],
          noPartialResults: true,
          requestConfig: { queryParams: { safe: "active" } },
        });

        const formattedResults = results.map((r) => ({
          title: r.title || "",
          url: r.link || "",
          snippet: r.description || "",
          source: "google" as const,
        }));

        searchCache.set(cacheKey, {
          results: formattedResults,
          timestamp: Date.now(),
          source: "google",
        });

        return formattedResults;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === "Bot protection detected" && mergedOptions.antiBot?.enabled) {
          // console.warn("Bot protection detected, falling back to Puppeteer...");
        } else {
          throw error;
        }
      }
    }

    // Use Puppeteer as fallback
    const results = await searchWithPuppeteer(query, mergedOptions);

    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      source: "google",
    });

    return results;
  } catch (error) {
    throw {
      message: "google search failed :(",
      code: "GOOGLE_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}
