import { Flight, FlightResult, FlightSearchOptions, SearchError } from "../types";
import { createStealthBrowser, parseProxyConfig, createRealisticHeaders } from "./common";

/**
 * Search for flights on Google Flights
 * @param query Search query (e.g. "flights from JFK to LHR") or options object
 * @param options Search options
 * @returns Promise<FlightResult>
 */
export async function searchFlights(
  query: string | FlightSearchOptions,
  options: FlightSearchOptions = {},
): Promise<FlightResult> {
  let opts: FlightSearchOptions;

  if (typeof query === "object") {
    opts = { ...query, ...options };
  } else {
    opts = options;
    // Attempt to parse query if provided as string, but relying on explicit options is better
  }

  // Construct URL
  // Basic format: https://www.google.com/travel/flights?q=Flights%20to%20LHR%20from%20JFK%20on%202023-05-01
  // Or more specific parameters
  let url = "https://www.google.com/travel/flights";

  const params: string[] = [];

  if (opts.from && opts.to) {
    let q = `Flights to ${opts.to} from ${opts.from}`;
    if (opts.departureDate) {
      q += ` on ${opts.departureDate}`;
    }
    if (opts.returnDate) {
      q += ` returning ${opts.returnDate}`;
    }
    params.push(`q=${encodeURIComponent(q)}`);
  } else if (typeof query === "string") {
    params.push(`q=${encodeURIComponent(query)}`);
  }

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }

  const proxy = parseProxyConfig(opts.proxy);
  const browser = await createStealthBrowser(proxy || undefined);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(createRealisticHeaders());

    // Navigate to Google Flights
    await page.goto(url, { waitUntil: "networkidle2", timeout: opts.timeout || 30000 });

    // Handle cookie consent if present (common in EU)
    try {
      const consentButton = await page.waitForSelector('button[aria-label="Accept all"]', { timeout: 5000 });
      if (consentButton) {
        await consentButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}); // Wait a bit if nav happens
      }
    } catch (e) {
      // No consent button found, proceed
    }

    // Wait for results to load
    // The selector for flight lists often changes, but usually there are accessible roles
    try {
      await page.waitForSelector('li[class*="pIav2d"]', { timeout: 10000 });
    } catch (e) {
      // Fallback or retry
    }

    // Extract flights
    const flights = await page.evaluate(() => {
      // We need to define the Flight interface inside evaluate because it runs in browser context
      // where the imported type isn't available at runtime.
      // Alternatively, we just use strict structure matching.
      interface BrowserFlight {
        airline: string;
        departureTime: string;
        arrivalTime: string;
        duration: string;
        price: string;
        stops: string;
        origin?: string;
        destination?: string;
      }

      const results: BrowserFlight[] = [];

      // Select flight list items
      // Note: CSS classes in Google Flights are obfuscated and change often.
      // We'll try to use more stable structure selectors where possible, or partial class matches.
      // Current observation of Google Flights DOM structure (approximate)
      const listItems = document.querySelectorAll('li[class*="pIav2d"]'); // Common container class for list items

      listItems.forEach((item) => {
        try {
          // Airline & Times often in specific aria-labels or text content
          const text = item.textContent || "";

          // Attempt to extract structured data
          // This is brittle and might need constant updates

          // Look for time pattern (e.g. 10:00 AM)
          const timeRegex = /(\d{1,2}:\d{2}\s*[AP]M)/g;
          const times = text.match(timeRegex);

          // Look for price
          const priceRegex = /([$€£]\d+(?:,\d+)?)/;
          const priceMatch = text.match(priceRegex);

          // Look for duration (e.g. 7 hr 30 min)
          const durationRegex = /(\d+\s*hr\s*\d*\s*min)/;
          const durationMatch = text.match(durationRegex);

          // Look for stops
          const stops = text.includes("Non-stop")
            ? "Non-stop"
            : text.includes("1 stop")
              ? "1 stop"
              : text.includes("stops")
                ? "2+ stops"
                : "Unknown";

          // Extract Airline (usually first text or near image)
          // Simple heuristic: Text lines before the time
          const airline = text.split(timeRegex)[0]?.trim() || "Unknown Airline";

          if (times && times.length >= 2 && priceMatch) {
            results.push({
              airline, // Heuristic
              departureTime: times[0],
              arrivalTime: times[1],
              duration: durationMatch ? durationMatch[0] : "Unknown",
              price: priceMatch[0],
              stops,
            });
          }
        } catch (err) {
          // Skip malformed items
        }
      });

      return results;
    });

    return {
      flights: flights.slice(0, opts.limit || 10),
      url,
      source: "google-flights",
    };
  } catch (error) {
    throw {
      message: `Failed to search flights: ${(error as Error).message}`,
      code: "FLIGHT_SEARCH_ERROR",
      originalError: error,
    } as SearchError;
  } finally {
    await browser.close();
  }
}
