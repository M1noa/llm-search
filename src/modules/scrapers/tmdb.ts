import { MediaResult, MediaSearchOptions, SearchError } from "../../types";
import {
  parseProxyConfig,
  createStealthBrowser,
  fetchWithDetection,
  createRealisticHeaders,
  getCacheKey,
  cleanText,
} from "../common";
import { JSDOM } from "jsdom";

// Rate limiting
const MIN_DELAY = 1000;
let lastSearchTime = 0;

async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastSearchTime;
  if (timeSinceLast < MIN_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY - timeSinceLast));
  }
  lastSearchTime = Date.now();
}

export async function searchTMDB(
  query: string,
  options: MediaSearchOptions = {}
): Promise<MediaResult[]> {
  try {
    await enforceRateLimit();

    const mergedOptions = { ...options };

    // Determine search type
    let searchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(query)}`;
    if (mergedOptions.type === "movie") {
      searchUrl = `https://www.themoviedb.org/search/movie?query=${encodeURIComponent(query)}`;
    } else if (mergedOptions.type === "tv") {
      searchUrl = `https://www.themoviedb.org/search/tv?query=${encodeURIComponent(query)}`;
    }

    // First try basic fetch
    try {
      if (!mergedOptions.forcePuppeteer) {
        return await scrapeTMDBWithFetch(searchUrl, mergedOptions);
      }
    } catch (e) {
      // Fallback to puppeteer below
      if (mergedOptions.forcePuppeteer) throw e;
      console.warn("TMDB fetch failed, falling back to Puppeteer", e);
    }

    // Fallback to Puppeteer
    return await scrapeTMDBWithPuppeteer(searchUrl, mergedOptions);

  } catch (error) {
    throw {
      message: "TMDB search failed",
      code: "TMDB_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

async function scrapeTMDBWithFetch(url: string, options: MediaSearchOptions): Promise<MediaResult[]> {
  const { body } = await fetchWithDetection(url, options);
  const dom = new JSDOM(body);
  const doc = dom.window.document;

  return parseTMDBResults(doc);
}

async function scrapeTMDBWithPuppeteer(url: string, options: MediaSearchOptions): Promise<MediaResult[]> {
  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for results
    try {
        await page.waitForSelector(".card", { timeout: 5000 });
    } catch (e) {
        // No results found or timeout
        return [];
    }

    const html = await page.content();
    const dom = new JSDOM(html);
    return parseTMDBResults(dom.window.document);
  } finally {
    await browser.close();
  }
}

function parseTMDBResults(doc: Document): MediaResult[] {
  const results: MediaResult[] = [];
  const cards = doc.querySelectorAll(".card");

  cards.forEach((card) => {
    if (results.length >= 10) return;

    const titleEl = card.querySelector("h2");
    const linkEl = card.querySelector("a.result"); // Usually the image link or title link
    const dateEl = card.querySelector(".date");
    const overviewEl = card.querySelector(".overview");
    const imgEl = card.querySelector("img");

    if (titleEl && linkEl) {
      const title = titleEl.textContent?.trim() || "";
      const href = (linkEl as HTMLAnchorElement).href;
      const url = href.startsWith("http") ? href : `https://www.themoviedb.org${href}`;

      const releaseDate = dateEl?.textContent?.trim();
      const description = overviewEl?.textContent?.trim();

      let posterUrl = (imgEl as HTMLImageElement)?.src || imgEl?.getAttribute("data-src") || undefined;
      if (posterUrl && !posterUrl.startsWith("http")) {
          posterUrl = `https://www.themoviedb.org${posterUrl}`;
      }

      // Determine type from URL if possible
      let mediaType: "movie" | "tv" | "anime" = "movie"; // Default
      if (url.includes("/tv/")) {
        mediaType = "tv";
      }

      // Basic info first
      results.push({
        title,
        url,
        description,
        releaseDate,
        posterUrl,
        source: "tmdb",
        mediaType
      });
    }
  });

  return results;
}

// Separate function to get details including cast and providers
// This would be called if the user asks for specific details on a result
export async function getTMDBDetails(url: string, options: MediaSearchOptions = {}): Promise<Partial<MediaResult>> {
    // This function visits the detail page to get cast, genres, rating, providers
    try {
        const { body } = await fetchWithDetection(url, options);
        const dom = new JSDOM(body);
        const doc = dom.window.document;

        // Rating
        const ratingEl = doc.querySelector(".user_score_chart");
        const rating = ratingEl?.getAttribute("data-percent") ? `${ratingEl.getAttribute("data-percent")}%` : undefined;

        // Genres
        const genres: string[] = [];
        doc.querySelectorAll(".genres a").forEach(el => {
            if (el.textContent) genres.push(el.textContent.trim());
        });

        // Cast
        const cast: string[] = [];
        doc.querySelectorAll(".people.scroller li.card p a").forEach(el => {
            if (el.textContent) cast.push(el.textContent.trim());
        });

        // Watch Providers (This is tricky as it's often loaded dynamically or in a separate section)
        // TMDB often lists them in a section called "Where to Watch" or similar,
        // but the actual data might be fetched via API or hidden.
        // For basic scraping, we check for provider logos/links if visible.
        const watchProviders: { name: string, type: "stream" | "rent" | "buy" }[] = [];

        // Check for provider list containers (provider structure varies)
        const providerSections = doc.querySelectorAll(".provider");
        providerSections.forEach(section => {
             const img = section.querySelector("img");
             if (img) {
                 const name = img.getAttribute("alt") || "";
                 if (name) {
                    // Heuristic to guess type usually requires more context, defaulting to stream
                    watchProviders.push({ name, type: "stream" });
                 }
             }
        });

        return {
            rating,
            genres,
            cast,
            watchProviders: watchProviders.length > 0 ? watchProviders : undefined
        };

    } catch (e) {
        console.warn("Failed to get TMDB details", e);
        return {};
    }
}
