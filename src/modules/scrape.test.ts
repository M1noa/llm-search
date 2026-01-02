import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getWebpageContent, getWebpageText } from "./scrape";
import * as common from "./common";
import { wikiGetContent } from "./wikipedia";
import { getStoryById } from "./hackernews";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { extractAnswerBox as extractGoogleAnswer } from "./scrapers/google";
import { extractAnswerBox as extractDDGAnswer } from "./scrapers/duckduckgo";

// Mock dependencies
vi.mock("./wikipedia");
vi.mock("./hackernews");
vi.mock("./scrapers/google", () => ({
  extractAnswerBox: vi.fn(),
}));
vi.mock("./scrapers/duckduckgo", () => ({
  extractAnswerBox: vi.fn(),
}));
vi.mock("@mozilla/readability");
vi.mock("jsdom");
vi.mock("./common", async () => {
  const actual = await vi.importActual<typeof import("./common")>("./common");
  return {
    ...actual,
    createStealthBrowser: vi.fn(),
    createRealisticHeaders: vi.fn().mockReturnValue({ "User-Agent": "test-agent" }),
    parseProxyConfig: vi.fn(),
    detectBotProtection: vi.fn().mockReturnValue(false),
    cleanText: vi.fn((text) => text?.trim() || ""),
  };
});

// Global fetch mock
global.fetch = vi.fn();

describe("Scrape Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default JSDOM/Readability mocks
    (JSDOM as unknown as Mock).mockImplementation(() => ({
      window: {
        document: {
          querySelectorAll: vi.fn().mockImplementation((selector) => {
            if (selector === "link[rel*='icon']") {
              return [{ href: "https://example.com/favicon.ico" }];
            }
            if (selector === "img") {
              return [{ src: "https://example.com/image1.jpg" }, { src: "https://example.com/image2.png" }];
            }
            return [];
          }),
          body: {
            textContent: "Test content from body",
          },
        },
      },
    }));

    (Readability as unknown as Mock).mockImplementation(() => ({
      parse: vi.fn().mockReturnValue({
        title: "Test Article",
        content: "<div>Test content</div>",
        textContent: "Test content",
        excerpt: "Test excerpt",
        siteName: "Test Site",
      }),
    }));
  });

  describe("URL Type Routing", () => {
    it("should route wikipedia URLs to wiki handler", async () => {
      (wikiGetContent as Mock).mockResolvedValue("Wiki content");

      const result = await getWebpageContent("https://en.wikipedia.org/wiki/Test");

      expect(result.siteName).toBe("Wikipedia");
      expect(result.content).toBe("Wiki content");
      expect(result.favicon).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(wikiGetContent).toHaveBeenCalledWith("Test");
    });

    it("should route hackernews URLs to HN handler", async () => {
      (getStoryById as Mock).mockResolvedValue({
        title: "HN Story",
        snippet: "HN Content",
      });

      const result = await getWebpageContent("https://news.ycombinator.com/item?id=12345");

      expect(result.siteName).toBe("Hacker News");
      expect(result.title).toBe("HN Story");
      expect(result.favicon).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(getStoryById).toHaveBeenCalledWith(12345);
    });

    it("should handle unsupported domains", async () => {
      const result = await getWebpageContent("https://youtube.com/watch?v=123");
      // Unsupported URLs now go through normalizeContent, which uses the JSDOM mock
      expect(result.textContent).toBe("Test content from body");
      expect(result.title).toBe("https://youtube.com/watch?v=123");
    });

    it("should route google search URLs and extract answer box", async () => {
      // Mock fetch response
      (global.fetch as Mock).mockResolvedValue({
        text: () => Promise.resolve("<html><body>Google Search Result</body></html>"),
        headers: new Map(),
      });

      // Mock extractor to return an answer
      (extractGoogleAnswer as Mock).mockReturnValue("The Answer is 42");

      const result = await getWebpageContent("https://www.google.com/search?q=answer");

      expect(result.siteName).toBe("Google");
      expect(result.title).toBe("Google Answer");
      expect(result.rawHtml).toContain("The Answer is 42");
      expect(extractGoogleAnswer).toHaveBeenCalled();
    });

    it("should route duckduckgo search URLs and extract answer box", async () => {
      // Mock fetch response
      (global.fetch as Mock).mockResolvedValue({
        text: () => Promise.resolve("<html><body>DDG Search Result</body></html>"),
        headers: new Map(),
      });

      // Mock extractor to return an answer
      (extractDDGAnswer as Mock).mockReturnValue("The DDG Answer");

      const result = await getWebpageContent("https://duckduckgo.com/?q=answer");

      expect(result.siteName).toBe("DuckDuckGo");
      expect(result.title).toBe("DuckDuckGo Answer");
      expect(result.rawHtml).toContain("The DDG Answer");
      expect(extractDDGAnswer).toHaveBeenCalled();
    });
  });

  describe("General Scraping (Fetch)", () => {
    it("should scrape content using fetch and readability", async () => {
      (global.fetch as Mock).mockResolvedValue({
        text: () => Promise.resolve("<html><body>Test</body></html>"),
        headers: new Map(),
      });

      const result = await getWebpageContent("https://example.com");

      expect(result.title).toBe("Test Article");
      expect(result.textContent).toBe("Test content");
      expect(result.favicon).toBe("https://example.com/favicon.ico");
      expect(result.imageUrls).toBeDefined();
      expect(result.imageUrls).toContain("https://example.com/image1.jpg");
      expect(result.imageUrls).toContain("https://example.com/image2.png");
      expect(result.markdown).toBeDefined();
      expect(result.markdown?.length).toBeGreaterThan(0);
      expect(result.rawHtml).toContain("<html><body>Test</body></html>");
      expect(global.fetch).toHaveBeenCalled();
      expect(Readability).toHaveBeenCalled();
    });

    it("should fallback to puppeteer if bot protection detected", async () => {
      // First call detects bot
      (global.fetch as Mock).mockResolvedValue({
        text: () => Promise.resolve("<html><body>Captcha</body></html>"),
        headers: new Map(),
      });
      (common.detectBotProtection as Mock).mockReturnValueOnce(true);

      // Mock puppeteer part
      const mockPage = {
        setViewport: vi.fn(),
        setExtraHTTPHeaders: vi.fn(),
        goto: vi.fn(),
        content: vi.fn().mockResolvedValue("<html><body>Real Content</body></html>"),
      };
      const mockBrowser = {
        pages: vi.fn().mockResolvedValue([]),
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn(),
      };
      (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);

      const result = await getWebpageContent("https://protected.com");

      expect(common.createStealthBrowser).toHaveBeenCalled();
      expect(result.title).toBe("Test Article");
    });
  });

  describe("General Scraping (Puppeteer)", () => {
    it("should use puppeteer when forced", async () => {
      const mockPage = {
        setViewport: vi.fn(),
        setExtraHTTPHeaders: vi.fn(),
        goto: vi.fn(),
        content: vi.fn().mockResolvedValue("<html><body>Puppeteer Content</body></html>"),
      };
      const mockBrowser = {
        pages: vi.fn().mockResolvedValue([]),
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn(),
      };
      (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);

      await getWebpageContent("https://example.com", { usePuppeteer: true });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(common.createStealthBrowser).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith("https://example.com", expect.any(Object));
    });
  });

  describe("getWebpageText", () => {
    it("should return only text content", async () => {
      (global.fetch as Mock).mockResolvedValue({
        text: () => Promise.resolve("html"),
        headers: new Map(),
      });

      const text = await getWebpageText("https://example.com");
      expect(text).toBe("Test content");
    });
  });
});
