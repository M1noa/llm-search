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
const MIN_DELAY = 1500;
let lastSearchTime = 0;

async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastSearchTime;
  if (timeSinceLast < MIN_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY - timeSinceLast));
  }
  lastSearchTime = Date.now();
}

export async function searchTheTVDB(query: string, options: MediaSearchOptions = {}): Promise<MediaResult[]> {
  try {
    await enforceRateLimit();

    const mergedOptions = { ...options };
    const searchUrl = `https://thetvdb.com/search?query=${encodeURIComponent(query)}`;

    // Try basic fetch first
    try {
      if (!mergedOptions.forcePuppeteer) {
        return await scrapeTheTVDBWithFetch(searchUrl, mergedOptions);
      }
    } catch (e) {
      if (mergedOptions.forcePuppeteer) throw e;
    }

    // Fallback to Puppeteer
    return await scrapeTheTVDBWithPuppeteer(searchUrl, mergedOptions);
  } catch (error) {
    throw {
      message: "TheTVDB search failed",
      code: "THETVDB_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

async function scrapeTheTVDBWithFetch(url: string, options: MediaSearchOptions): Promise<MediaResult[]> {
  const { body } = await fetchWithDetection(url, options);
  const dom = new JSDOM(body);
  return parseTheTVDBResults(dom.window.document);
}

async function scrapeTheTVDBWithPuppeteer(url: string, options: MediaSearchOptions): Promise<MediaResult[]> {
  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for results list
    try {
      await page.waitForSelector(".list-group, .media-list", { timeout: 5000 });
    } catch (e) {
      return [];
    }

    const html = await page.content();
    const dom = new JSDOM(html);
    return parseTheTVDBResults(dom.window.document);
  } finally {
    await browser.close();
  }
}

function parseTheTVDBResults(doc: Document): MediaResult[] {
  const results: MediaResult[] = [];
  // TheTVDB search results usually look like list items
  const items = doc.querySelectorAll(".list-group-item, li.media");

  items.forEach((item) => {
    if (results.length >= 10) return;

    const titleEl = item.querySelector("h4, .media-heading");
    const linkEl = item.querySelector("a");
    const imgEl = item.querySelector("img");
    const overviewEl = item.querySelector("p, .overview");
    const smallText = item.querySelector("small"); // Often contains date or network

    if (titleEl && linkEl) {
      const title = titleEl.textContent?.trim() || "";
      let href = linkEl.getAttribute("href") || "";
      if (href && !href.startsWith("http")) {
        href = `https://thetvdb.com${href}`;
      }

      const description = overviewEl?.textContent?.trim();
      let posterUrl = imgEl?.getAttribute("src") || undefined;

      // Filter out placeholder images if possible
      if (posterUrl?.includes("missing")) posterUrl = undefined;

      // Detect type
      let mediaType: "movie" | "tv" | "anime" = "tv"; // Default for TheTVDB
      if (href.includes("/movies/")) {
        mediaType = "movie";
      }
      // Often TheTVDB lists translations for "Series" or "Movie" in badges
      const badges = item.querySelectorAll(".badge");
      badges.forEach((badge) => {
        const text = badge.textContent?.toLowerCase();
        if (text === "movie") mediaType = "movie";
        if (text === "series") mediaType = "tv";
      });

      results.push({
        title,
        url: href,
        description,
        releaseDate: smallText?.textContent?.trim(),
        posterUrl,
        source: "thetvdb",
        mediaType,
      });
    }
  });

  return results;
}

export async function getTheTVDBDetails(url: string, options: MediaSearchOptions = {}): Promise<Partial<MediaResult>> {
  try {
    const { body } = await fetchWithDetection(url, options);
    const dom = new JSDOM(body);
    const doc = dom.window.document;

    // Extract genres
    const genres: string[] = [];
    // Look for genre links or definition lists
    // Typically in a sidebar or info block
    const genreLinks = doc.querySelectorAll("a[href*='/genres/']");
    genreLinks.forEach((link) => {
      if (link.textContent) genres.push(link.textContent.trim());
    });

    // Rating
    // TheTVDB structure for rating might be in a header or info block
    // Assuming a generic approach or looking for specific class if known
    // (This is best effort without live DOM inspection)

    return {
      genres: genres.length > 0 ? genres : undefined,
    };
  } catch (e) {
    return {};
  }
}
