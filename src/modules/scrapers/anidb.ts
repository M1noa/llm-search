import { MediaResult, MediaSearchOptions, SearchError } from "../../types";
import {
  parseProxyConfig,
  createStealthBrowser,
  createRealisticHeaders,
  getCacheKey,
} from "../common";
import { JSDOM } from "jsdom";

// AniDB requires stricter rate limiting to avoid bans
// They recommend 2s delay between requests
const MIN_DELAY = 2500;
let lastSearchTime = 0;

async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastSearchTime;
  if (timeSinceLast < MIN_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY - timeSinceLast));
  }
  lastSearchTime = Date.now();
}

/**
 * AniDB Scraper
 * AniDB has strict anti-bot protection ("AntiLeech").
 * We must use Puppeteer with Stealth plugin and respect rate limits.
 */
export async function searchAniDB(
  query: string,
  options: MediaSearchOptions = {}
): Promise<MediaResult[]> {
  try {
    await enforceRateLimit();

    const mergedOptions = {
      ...options,
      // Always force puppeteer for AniDB due to protection
      forcePuppeteer: true,
    };

    // AniDB search URL
    // do=animelist performs a search
    const searchUrl = `https://anidb.net/anime/?adb.search=${encodeURIComponent(query)}&do.update=Search&noalias=1`;

    return await scrapeAniDBWithPuppeteer(searchUrl, mergedOptions);
  } catch (error) {
    throw {
      message: "AniDB search failed",
      code: "ANIDB_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  }
}

async function scrapeAniDBWithPuppeteer(url: string, options: MediaSearchOptions): Promise<MediaResult[]> {
  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    // Navigate with a slightly longer timeout for AniDB
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for the anime list table
    try {
      await page.waitForSelector("table.animelist", { timeout: 10000 });
    } catch (e) {
      // Check if we got a single result redirect (AniDB sometimes redirects directly to the anime page)
      const currentUrl = page.url();
      if (currentUrl.includes("/anime/") && !currentUrl.includes("adb.search")) {
         // Single result found
         const html = await page.content();
         const dom = new JSDOM(html);
         const singleResult = parseAniDBSinglePage(dom.window.document, currentUrl);
         return singleResult ? [singleResult] : [];
      }
      return [];
    }

    const html = await page.content();
    const dom = new JSDOM(html);
    return parseAniDBList(dom.window.document);
  } finally {
    await browser.close();
  }
}

export async function getAniDBDetails(url: string, options: MediaSearchOptions = {}): Promise<Partial<MediaResult>> {
  try {
    await enforceRateLimit();
    const proxy = parseProxyConfig(options.proxy);
    const browser = await createStealthBrowser(proxy || undefined);

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders(createRealisticHeaders());

        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        const html = await page.content();
        const dom = new JSDOM(html);
        const result = parseAniDBSinglePage(dom.window.document, url);

        return result || {};
    } finally {
        await browser.close();
    }
  } catch (e) {
      console.warn("AniDB details fetch failed", e);
      return {};
  }
}

function parseAniDBList(doc: Document): MediaResult[] {
  const results: MediaResult[] = [];
  const rows = doc.querySelectorAll("table.animelist tbody tr");

  rows.forEach((row) => {
    if (results.length >= 10) return;

    // AniDB list columns: ID, Icon, Title, Type, Episodes, Rating, etc.
    // The title is usually in the "name" column (class .name or depending on layout)
    const titleLink = row.querySelector("td[data-label='Title'] a, td.name a");
    const imgEl = row.querySelector("img"); // Often thumbnails are small or hidden on list view

    if (titleLink) {
      const title = titleLink.textContent?.trim() || "";
      let href = titleLink.getAttribute("href") || "";
      if (href && !href.startsWith("http")) {
        href = `https://anidb.net${href}`;
      }

      // Try to get other metadata from columns if available
      const typeEl = row.querySelector("td[data-label='Type']");
      const ratingEl = row.querySelector("td[data-label='Rating']");

      const rating = ratingEl?.textContent?.trim();
      const type = typeEl?.textContent?.trim(); // e.g. TV, Movie, OVA

      results.push({
        title,
        url: href,
        rating,
        description: type ? `Type: ${type}` : undefined,
        source: "anidb",
        mediaType: "anime"
      });
    }
  });

  return results;
}

function parseAniDBSinglePage(doc: Document, url: string): MediaResult | null {
    // Parse a specific anime page if we get redirected there
    const titleEl = doc.querySelector("h1.anime");
    if (!titleEl) return null;

    const title = titleEl.textContent?.replace("Anime:", "").trim() || "";
    const descriptionEl = doc.querySelector("div.desc");
    const ratingEl = doc.querySelector("tr.rating td.value");
    const imgEl = doc.querySelector("div.image img");

    let posterUrl = imgEl?.getAttribute("src") || undefined;
    if (posterUrl && !posterUrl.startsWith("http")) {
        posterUrl = `https://anidb.net${posterUrl}`;
    }

    return {
        title,
        url,
        description: descriptionEl?.textContent?.trim(),
        rating: ratingEl?.textContent?.trim(),
        posterUrl,
        source: "anidb",
        mediaType: "anime"
    };
}
