import { ProxyConfig, SearchError, ScraperOptions } from "../types";
import puppeteer from "puppeteer-extra";
import type { Browser, LaunchOptions } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use stealth plugin
puppeteer.use(StealthPlugin());

// Type guard for objects with entries method (Headers, Map, etc.)
function hasEntries(value: unknown): value is { entries: () => IterableIterator<[string, string]> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "entries" in value &&
    typeof (value as { entries: unknown }).entries === "function"
  );
}

// Bot detection patterns
export const BOT_PROTECTION_PATTERNS = {
  cloudflare: [
    "cf-ray",
    "__cf_bm",
    "cloudflare",
    "challenge-platform",
    "Just a moment...",
    "Checking your browser",
    "DDoS protection by Cloudflare",
  ],
  perimeterx: ["_px", "perimeterx", "px-captcha", "PX", "bot-management"],
  akamai: ["akamai", "ak_bmsc", "akamaighost", "akamaized", "edgekey"],
  datadome: ["datadome", "__ddg_", "x-datadome", "ddg-", "bot-detection"],
  generic: [
    "captcha",
    "recaptcha",
    "hcaptcha",
    "access denied",
    "403 forbidden",
    "rate limit",
    "too many requests",
    "blocked",
    "security check",
    "unauthorized",
  ],
};

// Helper function to detect bot protection
export function detectBotProtection(
  headers: Headers | Map<string, string> | Record<string, string> | object | undefined,
  body: string,
): boolean {
  // Check headers
  if (headers) {
    // Handle Headers object or Map
    if (hasEntries(headers)) {
      for (const [key, value] of headers.entries()) {
        const headerContent = `${key}: ${value}`.toLowerCase();
        for (const patterns of Object.values(BOT_PROTECTION_PATTERNS)) {
          for (const pattern of patterns) {
            if (headerContent.includes(pattern.toLowerCase())) {
              return true;
            }
          }
        }
      }
    }
    // Handle plain object
    else if (typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) {
        const headerContent = `${key}: ${value}`.toLowerCase();
        for (const patterns of Object.values(BOT_PROTECTION_PATTERNS)) {
          for (const pattern of patterns) {
            if (headerContent.includes(pattern.toLowerCase())) {
              return true;
            }
          }
        }
      }
    }
  }

  // Check body content
  if (body) {
    const bodyLower = body.toLowerCase();
    for (const patterns of Object.values(BOT_PROTECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (bodyLower.includes(pattern.toLowerCase())) {
          return true;
        }
      }
    }
  }

  return false;
}

// Parse proxy configuration
export function parseProxyConfig(proxy?: ProxyConfig | string): { url: string; type: string } | null {
  if (!proxy) return null;

  if (typeof proxy === "string") {
    // Parse proxy URL
    try {
      const url = new URL(proxy);
      return {
        url: proxy,
        type: url.protocol.replace(":", ""),
      };
    } catch {
      throw new Error("Invalid proxy URL format");
    }
  }

  // Build proxy URL from config
  const auth = proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}@` : "";
  const proxyUrl = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
  return {
    url: proxyUrl,
    type: proxy.type,
  };
}

// Create realistic headers for basic requests
export function createRealisticHeaders(): Record<string, string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  ];

  return {
    "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    DNT: "1",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
  };
}

// Puppeteer stealth configuration with enhanced options
export async function createStealthBrowser(proxy?: { url: string; type: string }): Promise<Browser> {
  const launchOptions: LaunchOptions & { args: string[] } = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
    ],
  };

  if (proxy) {
    launchOptions.args.push(`--proxy-server=${proxy.url}`);
  }

  const browser = await puppeteer.launch(launchOptions);

  // Additional stealth measures
  try {
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    const context = page.browserContext();
    await context.overridePermissions("https://www.google.com", []);
    await context.overridePermissions("https://duckduckgo.com", []);
    if (pages.length === 0) await page.close();
  } catch (e) {
    // Ignore permissions errors if context doesn't support it
  }

  return browser;
}

// Fetch with bot detection
export async function fetchWithDetection(
  url: string,
  options: ScraperOptions,
): Promise<{ headers: Headers; body: string }> {
  const proxy = parseProxyConfig(options.proxy);
  const headers = createRealisticHeaders();

  const fetchOptions: RequestInit & { agent?: unknown } = {
    headers,
    timeout: options.timeout || 10000,
  } as RequestInit & { agent?: unknown };

  if (proxy) {
    try {
      let agent;
      if (proxy.type === "socks4" || proxy.type === "socks5") {
        const { SocksProxyAgent } = await import("socks-proxy-agent");
        agent = new SocksProxyAgent(proxy.url);
      } else {
        const { HttpsProxyAgent } = await import("https-proxy-agent");
        agent = new HttpsProxyAgent(proxy.url);
      }
      fetchOptions.agent = agent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw {
        message: `Proxy connection failed: ${errorMessage}`,
        code: "PROXY_CONNECTION_FAILED",
        originalError: error,
      } as SearchError;
    }
  }

  try {
    const response = await fetch(url, fetchOptions);
    const body = await response.text();

    if (detectBotProtection(response.headers, body)) {
      throw new Error("Bot protection detected");
    }

    return {
      headers: response.headers,
      body,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("407") || errorMessage.includes("authentication")) {
      throw {
        message: "Proxy authentication failed",
        code: "PROXY_AUTH_FAILED",
        originalError: error,
      } as SearchError;
    }
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
      throw {
        message: "Proxy connection refused",
        code: "PROXY_CONNECTION_REFUSED",
        originalError: error,
      } as SearchError;
    }
    throw error;
  }
}

// check if url is accessible
export async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// clean up text by removing excessive whitespace and making it more readable
export function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\n\s\r]+/g, " ")
    .replace(/([.!?])\s+/g, "$1\n\n")
    .trim();
}

// Helper function to get cache key
export function getCacheKey(query: string, options: ScraperOptions): string {
  return `${query}-${JSON.stringify(options)}`;
}
