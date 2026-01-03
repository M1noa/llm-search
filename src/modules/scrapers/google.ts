import { chromium, devices, BrowserContextOptions, Browser } from "playwright";
import { ScraperOptions, SearchResult, SearchError, ImageResult } from "../../types";
import { debugLog } from "../common";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Internal interfaces adapted from the source
interface FingerprintConfig {
  deviceName: string;
  locale: string;
  timezoneId: string;
  colorScheme: "dark" | "light";
  reducedMotion: "reduce" | "no-preference";
  forcedColors: "active" | "none";
}

interface SavedState {
  fingerprint?: FingerprintConfig;
  googleDomain?: string;
}

interface RawScrapeResult {
  title: string;
  link: string;
  snippet: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Get the host machine's actual configuration to mimic real user behavior
 */
function getHostMachineConfig(userLocale?: string): FingerprintConfig {
  const systemLocale = userLocale || process.env.LANG || "en-US";
  const timezoneOffset = new Date().getTimezoneOffset();
  let timezoneId = "America/New_York";

  // Infer timezone from offset
  if (timezoneOffset <= -480 && timezoneOffset > -600) timezoneId = "Asia/Shanghai";
  else if (timezoneOffset <= -540) timezoneId = "Asia/Tokyo";
  else if (timezoneOffset <= -420 && timezoneOffset > -480) timezoneId = "Asia/Bangkok";
  else if (timezoneOffset <= 0 && timezoneOffset > -60) timezoneId = "Europe/London";
  else if (timezoneOffset <= 60 && timezoneOffset > 0) timezoneId = "Europe/Berlin";
  else if (timezoneOffset <= 300 && timezoneOffset > 240) timezoneId = "America/New_York";

  const hour = new Date().getHours();
  const colorScheme = hour >= 19 || hour < 7 ? "dark" : "light";

  const platform = os.platform();
  let deviceName = "Desktop Chrome";
  if (platform === "darwin") deviceName = "Desktop Safari";
  else if (platform === "win32") deviceName = "Desktop Edge";
  else if (platform === "linux") deviceName = "Desktop Firefox";

  // Default to Chrome as in source
  deviceName = "Desktop Chrome";

  return {
    deviceName,
    locale: systemLocale,
    timezoneId,
    colorScheme,
    reducedMotion: "no-preference",
    forcedColors: "none",
  };
}

export async function searchGoogle(query: string, options: ScraperOptions = {}): Promise<SearchResult[]> {
  const limit = options.limit || 10;
  const timeout = options.timeout || 60000;
  const stateFile = path.resolve(process.cwd(), "google-search-state.json");
  const noSaveState = false; // Could expose this in options later
  const locale = "en-US"; // Default to English or infer from system

  // Always start headless first
  let useHeadless = true;

  debugLog("GooglePlaywright", "Initializing browser...");

  let storageState: string | undefined = undefined;
  let savedState: SavedState = {};
  const fingerprintFile = stateFile.replace(".json", "-fingerprint.json");

  if (fs.existsSync(stateFile)) {
    debugLog("GooglePlaywright", `Found browser state file: ${stateFile}`);
    storageState = stateFile;
    if (fs.existsSync(fingerprintFile)) {
      try {
        const fingerprintData = fs.readFileSync(fingerprintFile, "utf8");
        savedState = JSON.parse(fingerprintData);
      } catch (e) {
        debugLog("GooglePlaywright", "Failed to load fingerprint config, creating new one");
      }
    }
  }

  const deviceList = ["Desktop Chrome", "Desktop Edge", "Desktop Firefox", "Desktop Safari"];

  const googleDomains = [
    "https://www.google.com",
    "https://www.google.co.uk",
    "https://www.google.ca",
    "https://www.google.com.au",
  ];

  const getDeviceConfig = (): [string, any] => {
    if (savedState.fingerprint?.deviceName && devices[savedState.fingerprint.deviceName]) {
      return [savedState.fingerprint.deviceName, devices[savedState.fingerprint.deviceName]];
    }
    const randomDevice = deviceList[Math.floor(Math.random() * deviceList.length)];
    return [randomDevice, devices[randomDevice]];
  };

  const getRandomDelay = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  async function performSearch(headless: boolean): Promise<SearchResult[]> {
    debugLog("GooglePlaywright", `Starting browser in ${headless ? "headless" : "headful"} mode`);

    const browser = await chromium.launch({
      headless,
      timeout: timeout * 2,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-extensions",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-renderer-backgrounding",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--force-color-profile=srgb",
        "--metrics-recording-only",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    const [deviceName, deviceConfig] = getDeviceConfig();
    let contextOptions: BrowserContextOptions = { ...deviceConfig };

    if (savedState.fingerprint) {
      contextOptions = {
        ...contextOptions,
        locale: savedState.fingerprint.locale,
        timezoneId: savedState.fingerprint.timezoneId,
        colorScheme: savedState.fingerprint.colorScheme,
        reducedMotion: savedState.fingerprint.reducedMotion,
        forcedColors: savedState.fingerprint.forcedColors,
      };
    } else {
      const hostConfig = getHostMachineConfig(locale);
      if (hostConfig.deviceName !== deviceName) {
        contextOptions = { ...devices[hostConfig.deviceName] };
      }
      contextOptions = {
        ...contextOptions,
        locale: hostConfig.locale,
        timezoneId: hostConfig.timezoneId,
        colorScheme: hostConfig.colorScheme,
        reducedMotion: hostConfig.reducedMotion,
        forcedColors: hostConfig.forcedColors,
      };
      savedState.fingerprint = hostConfig;
    }

    contextOptions = {
      ...contextOptions,
      permissions: ["geolocation", "notifications"],
      acceptDownloads: true,
      isMobile: false,
      hasTouch: false,
      javaScriptEnabled: true,
    };

    const context = await browser.newContext(storageState ? { ...contextOptions, storageState } : contextOptions);

    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      // @ts-ignore
      window.chrome = { runtime: {}, loadTimes: function () {}, csi: function () {}, app: {} };

      if (typeof WebGLRenderingContext !== "undefined") {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
          if (parameter === 37445) return "Intel Inc.";
          if (parameter === 37446) return "Intel Iris OpenGL Engine";
          return getParameter.call(this, parameter);
        };
      }
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", { get: () => 1920 });
      Object.defineProperty(window.screen, "height", { get: () => 1080 });
      Object.defineProperty(window.screen, "colorDepth", { get: () => 24 });
      Object.defineProperty(window.screen, "pixelDepth", { get: () => 24 });
    });

    try {
      let selectedDomain: string;
      if (savedState.googleDomain) {
        selectedDomain = savedState.googleDomain;
      } else {
        selectedDomain = googleDomains[Math.floor(Math.random() * googleDomains.length)];
        savedState.googleDomain = selectedDomain;
      }

      const isImageSearch = options.category === "images";
      let navigationUrl = selectedDomain;

      if (isImageSearch) {
        navigationUrl = `${selectedDomain}/search?q=${encodeURIComponent(query)}&tbm=isch`;
        debugLog("GooglePlaywright", `Navigating to image search: ${navigationUrl}`);
      } else {
        debugLog("GooglePlaywright", `Navigating to ${selectedDomain}`);
      }

      const response = await page.goto(navigationUrl, { timeout, waitUntil: "networkidle" });

      const currentUrl = page.url();
      const sorryPatterns = ["google.com/sorry", "recaptcha", "captcha", "unusual traffic"];
      const isBlockedPage = sorryPatterns.some((p) => currentUrl.includes(p) || response?.url().includes(p));

      if (isBlockedPage) {
        if (headless) {
          debugLog("GooglePlaywright", "Bot detection triggered in headless mode. Restarting in headful mode...");
          await browser.close();
          return performSearch(false);
        } else {
          debugLog("GooglePlaywright", "Please solve CAPTCHA manually...");
          await page.waitForNavigation({
            timeout: timeout * 2,
            url: (url) => sorryPatterns.every((p) => !url.toString().includes(p)),
          });
          debugLog("GooglePlaywright", "CAPTCHA solved, continuing...");
        }
      }

      if (!isImageSearch) {
        // Handle search input for text search
        const searchInputSelectors = [
          "textarea[name='q']",
          "input[name='q']",
          "textarea[title='Search']",
          "input[aria-label='Search']",
        ];
        let searchInput = null;
        for (const selector of searchInputSelectors) {
          searchInput = await page.$(selector);
          if (searchInput) break;
        }

        if (!searchInput) throw new Error("Could not find search input");

        await searchInput.click();
        await page.keyboard.type(query, { delay: getRandomDelay(10, 30) });
        await page.waitForTimeout(getRandomDelay(100, 300));
        await page.keyboard.press("Enter");

        debugLog("GooglePlaywright", "Waiting for results...");
        await page.waitForLoadState("networkidle", { timeout });
      }

      // Check for block after search
      if (sorryPatterns.some((p) => page.url().includes(p))) {
        if (headless) {
          debugLog("GooglePlaywright", "Bot detection after search. Restarting headful...");
          await browser.close();
          return performSearch(false);
        } else {
          debugLog("GooglePlaywright", "Please solve CAPTCHA...");
          await page.waitForNavigation({
            timeout: timeout * 2,
            url: (url) => sorryPatterns.every((p) => !url.toString().includes(p)),
          });
        }
      }

      // Wait for results
      const resultSelectors = isImageSearch
        ? ["div.isv-r", "div[data-ri]"]
        : ["#search", "#rso", ".g", "div[role='main']"];

      let resultsFound = false;
      for (const selector of resultSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          resultsFound = true;
          break;
        } catch (e) {}
      }

      if (!resultsFound && headless) {
        // If no results in headless, might be a subtle block
        debugLog("GooglePlaywright", "No results found in headless. Retrying headful...");
        await browser.close();
        return performSearch(false);
      }

      // Extract results
      const results = await page.evaluate<RawScrapeResult[], { maxResults: number; isImageSearch: boolean }>(
        ({ maxResults, isImageSearch }: { maxResults: number; isImageSearch: boolean }) => {
          if (isImageSearch) {
            interface ScrapedImage {
              title: string;
              link: string;
              imageUrl: string;
              thumbnailUrl: string;
              snippet: string;
            }
            const items: ScrapedImage[] = [];
            const containers = document.querySelectorAll("div.isv-r");

            for (const container of containers) {
              if (items.length >= maxResults) break;

              const linkAnchor = container.querySelector("a[jsname='UYbX3']") as HTMLAnchorElement;
              const imgElement = container.querySelector("img") as HTMLImageElement;

              if (!linkAnchor || !imgElement) continue;

              const title = linkAnchor.getAttribute("title") || linkAnchor.innerText || "Image result";
              const url = linkAnchor.href;
              const thumbnailUrl = imgElement.src;
              // Use thumbnail as imageUrl if we can't get better resolution easily without interaction
              const imageUrl = thumbnailUrl;

              if (url && imageUrl) {
                items.push({
                  title,
                  link: url,
                  imageUrl,
                  thumbnailUrl,
                  snippet: title,
                });
              }
            }
            return items;
          }

          interface ScrapedText {
            title: string;
            link: string;
            snippet: string;
          }
          const items: ScrapedText[] = [];
          const seenUrls = new Set<string>();

          const selectorSets = [
            { container: "#search div[data-hveid]", title: "h3", snippet: ".VwiC3b" },
            { container: "#rso div[data-hveid]", title: "h3", snippet: '[data-sncf="1"]' },
            { container: ".g", title: "h3", snippet: 'div[style*="webkit-line-clamp"]' },
            { container: "div[jscontroller][data-hveid]", title: "h3", snippet: 'div[role="text"]' },
          ];

          for (const selectors of selectorSets) {
            if (items.length >= maxResults) break;
            const containers = document.querySelectorAll(selectors.container);

            for (const container of containers) {
              if (items.length >= maxResults) break;
              const titleEl = container.querySelector(selectors.title);
              if (!titleEl) continue;

              const title = (titleEl.textContent || "").trim();
              let link = "";
              const anchor = container.querySelector("a");
              if (anchor) link = anchor.href;

              if (!link || !link.startsWith("http") || seenUrls.has(link)) continue;

              let snippet = "";
              const snippetEl = container.querySelector(selectors.snippet);
              if (snippetEl) snippet = (snippetEl.textContent || "").trim();
              else {
                // Fallback snippet
                const textDivs = Array.from(container.querySelectorAll("div"));
                const longText = textDivs.find((el) => !el.querySelector("h3") && (el.textContent || "").length > 20);
                if (longText) snippet = (longText.textContent || "").trim();
              }

              if (title && link) {
                items.push({ title, link, snippet });
                seenUrls.add(link);
              }
            }
          }
          return items.slice(0, maxResults);
        },
        { maxResults: limit, isImageSearch },
      );

      debugLog("GooglePlaywright", `Found ${results.length} results`);

      // Save state
      if (!noSaveState) {
        await context.storageState({ path: stateFile });
        fs.writeFileSync(fingerprintFile, JSON.stringify(savedState, null, 2));
      }

      await browser.close();

      // Map to SearchResult interface
      return results.map((r) => {
        if (isImageSearch) {
          return {
            title: r.title,
            url: r.link,
            snippet: r.snippet,
            source: "google-images",
            imageUrl: r.imageUrl,
            thumbnailUrl: r.thumbnailUrl,
          } as ImageResult;
        }
        return {
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          source: "google",
        };
      });
    } catch (error) {
      debugLog("GooglePlaywright", `Error: ${error}`);
      await browser.close();
      throw {
        message: "Google Playwright search failed",
        code: "GOOGLE_SEARCH_ERROR",
        originalError: error,
      } as SearchError;
    }
  }

  return performSearch(useHeadless);
}

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
