import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { search, searchGoogle, searchDuckDuckGo, searchSearxNG } from "./search";
import * as common from "./common";
import { chromium } from "playwright";

// Define strict types for mocks
interface MockPage {
  goto: Mock;
  url: Mock;
  $: Mock;
  click: Mock;
  keyboard: { type: Mock; press: Mock };
  waitForTimeout: Mock;
  waitForLoadState: Mock;
  waitForSelector: Mock;
  waitForNavigation: Mock;
  evaluate: Mock;
  addInitScript: Mock;
  content: Mock;
  close: Mock;
  setViewport: Mock;
  setExtraHTTPHeaders: Mock;
}

interface MockContext {
  newPage: Mock;
  addInitScript: Mock;
  storageState: Mock;
  close: Mock;
}

interface MockBrowser {
  newContext: Mock;
  close: Mock;
  newPage?: Mock;
}

// Mock Playwright
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
  devices: {
    "Desktop Chrome": {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    },
  },
}));

// Mock Common Utils
vi.mock("./common", async () => {
  const actual = await vi.importActual<typeof import("./common")>("./common");
  return {
    ...actual,
    createStealthBrowser: vi.fn(),
    fetchWithDetection: vi.fn(),
    parseProxyConfig: vi.fn(),
    debugLog: vi.fn(),
  };
});

describe("Search Module", () => {
  let mockBrowser: MockBrowser;
  let mockContext: MockContext;
  let mockPage: MockPage;

  beforeEach(() => {
    vi.resetAllMocks();
    (common.parseProxyConfig as Mock).mockReturnValue(null);

    // Setup Playwright mocks
    mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue("https://www.google.com/search?q=test"),
      $: vi.fn(),
      click: vi.fn(),
      keyboard: {
        type: vi.fn(),
        press: vi.fn(),
      },
      waitForTimeout: vi.fn(),
      waitForLoadState: vi.fn(),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      evaluate: vi.fn(),
      addInitScript: vi.fn(),
      content: vi.fn(),
      close: vi.fn(),
      setViewport: vi.fn(),
      setExtraHTTPHeaders: vi.fn(),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      addInitScript: vi.fn(),
      storageState: vi.fn(),
      close: vi.fn(),
    };

    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
      newPage: vi.fn().mockResolvedValue(mockPage),
    };

    (chromium.launch as Mock).mockResolvedValue(mockBrowser);
  });

  describe("searchGoogle", () => {
    it("should return results using Playwright", async () => {
      const mockResults = [
        {
          title: "Test Title",
          link: "https://example.com",
          snippet: "Test Snippet",
        },
      ];

      // Mock search input found
      mockPage.$.mockResolvedValue({
        click: vi.fn(),
      });

      // Mock evaluate returning results
      mockPage.evaluate.mockResolvedValue(mockResults);

      const results = await searchGoogle("test query");

      expect(chromium.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "Test Title",
        url: "https://example.com",
        snippet: "Test Snippet",
        source: "google",
      });
    });

    it("should handle bot protection by retrying in headful mode", async () => {
      // First attempt (headless) detects bot protection
      mockPage.url
        .mockReturnValueOnce("https://www.google.com/sorry/index") // First check
        .mockReturnValue("https://www.google.com/search?q=test"); // Subsequent checks

      // Mock evaluate results for the second attempt
      const mockResults = [
        {
          title: "Headful Title",
          link: "https://example.com/headful",
          snippet: "Headful Snippet",
        },
      ];
      mockPage.evaluate.mockResolvedValue(mockResults);

      // Mock search input found
      mockPage.$.mockResolvedValue({
        click: vi.fn(),
      });

      const results = await searchGoogle("test query");

      // Should have launched browser twice
      expect(chromium.launch).toHaveBeenCalledTimes(2);
      // First launch headless
      expect(chromium.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({ headless: true }));
      // Second launch headful (headless: false)
      expect(chromium.launch).toHaveBeenNthCalledWith(2, expect.objectContaining({ headless: false }));

      expect(results[0].title).toBe("Headful Title");
    });
  });

  describe("searchDuckDuckGo", () => {
    it("should return results by scraping HTML", async () => {
      const mockHtml = `
        <div class="result">
          <h2 class="result__title">
            <a href="/l/?uddg=https%3A%2F%2Fddg.com">DDG Title</a>
          </h2>
          <div class="result__snippet">DDG Snippet</div>
          <div class="result__url">https://ddg.com</div>
        </div>
      `;

      (common.fetchWithDetection as Mock).mockResolvedValue({ headers: {}, body: mockHtml });

      const results = await searchDuckDuckGo("test query");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "DDG Title",
        url: "https://ddg.com",
        snippet: "DDG Snippet",
        source: "duckduckgo",
      });
    });

    it("should fallback to puppeteer if HTML scraping fails or returns no results", async () => {
      // Mock HTML scrape returning empty results
      (common.fetchWithDetection as Mock).mockResolvedValue({
        headers: {},
        body: "<html><body>No results</body></html>",
      });

      // Mock puppeteer via createStealthBrowser
      (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);
      mockPage.evaluate.mockResolvedValue([
        { title: "Puppeteer DDG", url: "https://ddg-pup.com", snippet: "Snippet", source: "duckduckgo" },
      ]);

      // Use a unique query to avoid cache hit from previous test
      const results = await searchDuckDuckGo("test query fallback");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Puppeteer DDG");
      expect(common.createStealthBrowser).toHaveBeenCalled();
    });
  });

  describe("searchSearxNG", () => {
    it("should return results from JSON API", async () => {
      const mockResponse = {
        results: [{ title: "Searx Result", url: "https://searx.com", content: "Searx Snippet" }],
      };

      (common.fetchWithDetection as Mock).mockResolvedValue({
        headers: {},
        body: JSON.stringify(mockResponse),
      });

      const results = await searchSearxNG("test query");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "Searx Result",
        url: "https://searx.com",
        snippet: "Searx Snippet",
        source: "searxng",
      });
    });
  });

  describe("Unified Search", () => {
    it("should try DuckDuckGo first", async () => {
      // Mock DDG success
      const mockHtml = `
        <div class="result">
          <h2 class="result__title">
             <a href="/l/?uddg=https%3A%2F%2Fddg.com">DDG Title</a>
          </h2>
          <div class="result__snippet">Desc</div>
        </div>`;
      (common.fetchWithDetection as Mock).mockResolvedValue({ headers: {}, body: mockHtml });

      const results = await search("unified");
      expect(results[0].source).toBe("duckduckgo");
    });

    it("should fallback to Google if DuckDuckGo fails", async () => {
      // Mock DDG failure (both HTML and Puppeteer)
      // 1. Fetch HTML -> throws error
      (common.fetchWithDetection as Mock).mockRejectedValueOnce(new Error("DDG Fetch Fail"));

      // 2. Puppeteer -> throws error
      (common.createStealthBrowser as Mock).mockRejectedValueOnce(new Error("DDG Puppeteer Fail"));

      // Mock Google Success (Playwright)
      mockPage.$.mockResolvedValue({ click: vi.fn() });
      mockPage.evaluate.mockResolvedValue([{ title: "Google", link: "https://google.com", snippet: "desc" }]);

      const results = await search("fallback");
      expect(results[0].source).toBe("google");
    });

    it("should fallback to SearxNG if Google fails", async () => {
      // Fail DDG (Fetch + Puppeteer)
      (common.fetchWithDetection as Mock).mockRejectedValueOnce(new Error("DDG Fail"));
      (common.createStealthBrowser as Mock).mockRejectedValueOnce(new Error("DDG Puppeteer Fail"));

      // Fail Google (Playwright)
      (chromium.launch as Mock).mockRejectedValueOnce(new Error("Google Playwright Fail"));

      // SearxNG Success
      // Note: fetchWithDetection is called for SearxNG. We need to queue strict return values or use mock implementation
      (common.fetchWithDetection as Mock).mockResolvedValueOnce({
        headers: {},
        body: JSON.stringify({ results: [{ title: "Searx", url: "https://s.com", content: "c" }] }),
      });

      const results = await search("deep fallback");
      expect(results[0].source).toBe("searxng");
    });
  });
});
