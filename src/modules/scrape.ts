import { ScraperOptions, SearchError, WebpageContent } from "../types";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { wikiGetContent } from "./wikipedia";
import { getStoryById } from "./hackernews";
import { extractAnswerBox as extractGoogleAnswer } from "./scrapers/google";
import { extractAnswerBox as extractDDGAnswer } from "./scrapers/duckduckgo";
import {
  createStealthBrowser,
  createRealisticHeaders,
  parseProxyConfig,
  cleanText as commonCleanText,
  detectBotProtection,
} from "./common";

// Configure TurndownService once for better performance
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// check url type and get appropriate handler
function getUrlType(
  url: string,
): "wikipedia" | "hackernews" | "google-search" | "duckduckgo-search" | "general" | "unsupported" {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes("wikipedia.org")) {
      return "wikipedia";
    }

    if (hostname === "news.ycombinator.com" && url.includes("item?id=")) {
      return "hackernews";
    }

    if (hostname.includes("google.") && urlObj.pathname.startsWith("/search")) {
      return "google-search";
    }

    if (hostname.includes("duckduckgo.com") && (urlObj.searchParams.has("q") || url.includes("?q="))) {
      return "duckduckgo-search";
    }

    // list of domains that don't work well with readability
    const unsupported = [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "twitter.com",
      "x.com",
      "instagram.com",
      "facebook.com",
      "linkedin.com",
    ];

    if (unsupported.some((domain) => hostname.includes(domain))) {
      return "unsupported";
    }

    return "general";
  } catch {
    return "unsupported";
  }
}

// Helper to extract images from DOM
function extractImages(doc: Document): string[] {
  const imageUrls: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = (img as HTMLImageElement).src;
    // JSDOM resolves relative URLs to absolute when initialized with url option
    if (src && src.length > 0) {
      imageUrls.push(src);
    }
  });
  return imageUrls;
}

// Helper to extract favicon from DOM
function extractFavicon(doc: Document, url: string): string | undefined {
  const iconLinks = doc.querySelectorAll("link[rel*='icon']");
  if (iconLinks.length > 0) {
    return (iconLinks[0] as HTMLLinkElement).href;
  }

  try {
    return new URL("/favicon.ico", url).href;
  } catch {
    return undefined;
  }
}

// Unified content normalizer - ensures all handlers produce consistent output
export interface NormalizeContentParams {
  url: string;
  html: string;
  title?: string;
  siteName?: string;
  fallbackFavicon?: string;
  skipReadability?: boolean;
}

export function normalizeContent(params: NormalizeContentParams): WebpageContent {
  const { url, html, title, siteName, fallbackFavicon, skipReadability } = params;

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Extract metadata using helpers
  const favicon = extractFavicon(doc, url) || fallbackFavicon;
  const imageUrls = extractImages(doc);

  // Use Readability for better content extraction unless explicitly skipped
  let finalContent = html;
  let finalTitle = title || url;
  let textContent = "";
  let excerpt: string | undefined;
  let finalSiteName = siteName;

  if (!skipReadability) {
    const reader = new Readability(doc);
    const article = reader.parse();

    if (article) {
      finalContent = article.content || html;
      finalTitle = article.title || title || url;
      textContent = commonCleanText(article.textContent || "");
      excerpt = article.excerpt || undefined;
      finalSiteName = siteName || article.siteName || undefined;
    } else {
      // Readability failed, fall back to raw extraction
      textContent = commonCleanText(doc.body?.textContent || "");
      excerpt = textContent.slice(0, 200) + (textContent.length > 200 ? "..." : "");
    }
  } else {
    // Skip Readability - use raw extraction
    textContent = commonCleanText(doc.body?.textContent || "");
    excerpt = textContent.slice(0, 200) + (textContent.length > 200 ? "..." : "");
  }

  const markdown = turndownService.turndown(finalContent);

  return {
    title: finalTitle,
    content: finalContent,
    textContent,
    length: textContent.length,
    excerpt,
    siteName: finalSiteName,
    favicon,
    imageUrls,
    markdown,
    rawHtml: html,
  };
}

// get webpage content using readability with stealth puppeteer
export async function getWebpageContent(
  url: string,
  options?: ({ usePuppeteer?: boolean } & ScraperOptions) | boolean,
): Promise<WebpageContent> {
  // Backward compatibility: if options is boolean, treat as usePuppeteer
  if (typeof options === "boolean") {
    options = { usePuppeteer: options };
  } else if (!options) {
    options = {};
  }

  // Cast options to the correct type for internal use
  const opts = options as { usePuppeteer?: boolean } & ScraperOptions;

  try {
    const urlType = getUrlType(url);

    // handle special cases
    if (urlType === "wikipedia") {
      const title = url.split("/wiki/")[1]?.replace(/_/g, " ") || url;
      const html = await wikiGetContent(title);

      return normalizeContent({
        url,
        html,
        title,
        siteName: "Wikipedia",
        fallbackFavicon: "https://en.wikipedia.org/static/favicon/wikipedia.ico",
        skipReadability: true, // Wikipedia content is already clean from their API
      });
    }

    if (urlType === "hackernews") {
      const idStr = url.split("id=")[1];
      const id = parseInt(idStr);
      const story = await getStoryById(id);
      const html = story.snippet || story.title || "No content available";

      return normalizeContent({
        url,
        html,
        title: story.title || url,
        siteName: "Hacker News",
        fallbackFavicon: "https://news.ycombinator.com/favicon.ico",
        skipReadability: true, // HN snippets are already clean
      });
    }

    if (urlType === "unsupported") {
      return normalizeContent({
        url,
        html: "<html><body><p>This URL type is not supported for content extraction.</p></body></html>",
        title: url,
        skipReadability: true,
      });
    }

    // handle general case with readability
    let html: string;

    if (opts.usePuppeteer) {
      // Use stealth puppeteer for bot-protected sites
      const proxy = parseProxyConfig(opts.proxy);
      const browser = await createStealthBrowser(proxy || undefined);

      try {
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders(createRealisticHeaders());

        await page.goto(url, { waitUntil: "networkidle2" });
        html = await page.content();
      } finally {
        await browser.close();
      }
    } else {
      try {
        const headers = createRealisticHeaders();
        const fetchOptions: RequestInit & { agent?: unknown } = { headers };

        const proxy = parseProxyConfig(opts.proxy);
        if (proxy) {
          if (proxy.type === "socks4" || proxy.type === "socks5") {
            const { SocksProxyAgent } = await import("socks-proxy-agent");
            fetchOptions.agent = new SocksProxyAgent(proxy.url);
          } else {
            const { HttpsProxyAgent } = await import("https-proxy-agent");
            fetchOptions.agent = new HttpsProxyAgent(proxy.url);
          }
        }

        const response = await fetch(url, fetchOptions);
        html = await response.text();

        if (detectBotProtection(response.headers, html)) {
          // If bot protection detected, re-run with puppeteer
          return await getWebpageContent(url, { ...opts, usePuppeteer: true });
        }
      } catch {
        // If basic fetch fails, try with puppeteer
        return await getWebpageContent(url, { ...opts, usePuppeteer: true });
      }
    }

    // Extract Answer Box for Search Engines
    if (urlType === "google-search") {
      const dom = new JSDOM(html);
      const answer = extractGoogleAnswer(dom.window.document);
      if (answer) {
        return normalizeContent({
          url,
          html: `<div class="answer-box"><h1>Google Answer</h1><p>${answer}</p></div>`,
          title: "Google Answer",
          siteName: "Google",
          skipReadability: true,
          fallbackFavicon: "https://www.google.com/favicon.ico",
        });
      }
    }

    if (urlType === "duckduckgo-search") {
      const dom = new JSDOM(html);
      const answer = extractDDGAnswer(dom.window.document);
      if (answer) {
        return normalizeContent({
          url,
          html: `<div class="answer-box"><h1>DuckDuckGo Answer</h1><p>${answer}</p></div>`,
          title: "DuckDuckGo Answer",
          siteName: "DuckDuckGo",
          skipReadability: true,
          fallbackFavicon: "https://duckduckgo.com/favicon.ico",
        });
      }
    }

    return normalizeContent({
      url,
      html,
      skipReadability: false,
    });
  } catch (err) {
    throw {
      message: "failed to get webpage content :/",
      code: "WEBPAGE_ERROR",
      originalError: err,
    } as SearchError;
  }
}

// get just the text content
export async function getWebpageText(
  url: string,
  options: { usePuppeteer?: boolean } & ScraperOptions = {},
): Promise<string> {
  const content = await getWebpageContent(url, options);
  return content.textContent;
}
