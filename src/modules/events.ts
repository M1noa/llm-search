import { EventResult, EventSearchOptions, SearchError } from "../types";
import { createStealthBrowser, parseProxyConfig, createRealisticHeaders } from "./common";

/**
 * Search for events using Google Events
 * @param query Search query (e.g. "concerts in New York")
 * @param options Search options
 * @returns Promise<EventResult>
 */
export async function searchEvents(query: string, options: EventSearchOptions = {}): Promise<EventResult> {
  // Construct URL
  // We use the standard search with ibp=htl;events param which triggers the events UI
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&ibp=htl;events`;

  if (options.date) {
    // Google supports date filters via chip selection or query refinement
    // Adding it to query is often easiest: "events in New York tomorrow"
    // But let's append it to the query string if provided
    // url += `&tbs=qdr:${options.date}`; // This is for search results, might not work for Events UI
    // Better to just modify the query passed in or rely on user to include date in query
  }

  const proxy = parseProxyConfig(options.proxy);
  const browser = await createStealthBrowser(proxy || undefined);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    // Navigate to Google Events
    await page.goto(url, { waitUntil: "networkidle2", timeout: options.timeout || 30000 });

    // Handle cookie consent if present
    try {
      const consentButton = await page.waitForSelector('button[aria-label="Accept all"]', { timeout: 5000 });
      if (consentButton) {
        await consentButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
      }
    } catch {
      // No consent button found, proceed
    }

    // Wait for event list to load
    // The main container often has specific data-attributes or classes
    // We'll wait for generic item containers
    try {
      await page.waitForSelector("ul li", { timeout: 10000 });
    } catch {
      // Fallback
    }

    // Extract events
    const events = await page.evaluate(() => {
      interface BrowserEvent {
        title: string;
        date: string;
        location: string;
        link?: string;
        description?: string;
        image?: string;
      }

      const results: BrowserEvent[] = [];

      // Select all text elements that look like events
      // Google Events UI is complex.
      // Strategy: Look for the list items in the side panel or main view.
      // Often they are in a scrollable container.

      // Trying to find the main list items.
      // Common pattern in Google Events: div with jsname and specific attributes.
      // We will look for elements that contain date/time info and titles.

      // Locate the main list container. It usually has role="list" or similar.
      const listItems = document.querySelectorAll("ul li");

      listItems.forEach((item) => {
        try {
          const text = (item as HTMLElement).innerText;
          if (!text || text.length < 10) return;

          // Attempt to split text into lines to guess structure
          const lines = text.split("\n").filter((l: string) => l.trim().length > 0);

          if (lines.length < 3) return;

          // Heuristics for Google Events List Item:
          // 1. Date (Month Day)
          // 2. Title
          // 3. Location
          // 4. Time

          // Let's try to extract specific elements if classes exist, otherwise fallback to text analysis

          // Title usually has role="heading" or specific font classes
          const titleEl = item.querySelector('[role="heading"], [aria-level]');
          const title = titleEl?.textContent || lines[0] || "Unknown Event";

          // Date/Time
          // Often first or second line
          const date =
            lines.find((l: string) =>
              /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Today|Tomorrow|Mon|Tue|Wed|Thu|Fri|Sat|Sun/i.test(l),
            ) || "Upcoming";

          // Location
          // Often contains address-like patterns or comes after title
          const location = lines.find((l: string) => l !== title && l !== date && l.length > 5) || "Unknown Location";

          // Image
          const img = item.querySelector("img");
          const image = img?.src;

          // Link - sometimes the item itself is clickable or contains a link
          const linkEl = item.querySelector("a");
          const link = linkEl?.href;

          // If no link found, construct one (it's usually a google search refinement)
          if (!link) {
            // link = ...
          }

          results.push({
            title,
            date,
            location,
            link,
            description: text, // Store full text as description for now
            image,
          });
        } catch {
          // Skip
        }
      });

      return results;
    });

    // Filter duplicates and low quality results
    const uniqueEvents = events.filter(
      (e, i, self) => i === self.findIndex((t) => t.title === e.title && t.date === e.date),
    );

    return {
      events: uniqueEvents.slice(0, options.limit || 10),
      url,
      source: "google-events",
    };
  } catch (error) {
    throw {
      message: `Failed to search events: ${(error as Error).message}`,
      code: "EVENT_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  } finally {
    await browser.close();
  }
}
