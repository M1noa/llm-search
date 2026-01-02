import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { search, searchGoogle, searchDuckDuckGo, searchSearxNG } from "./search";
import * as common from "./common";
import { search as googleSrSearch } from "google-sr";

// Mock dependencies
vi.mock("google-sr");
vi.mock("./common", async () => {
  const actual = await vi.importActual<typeof import("./common")>("./common");
  return {
    ...actual,
    createStealthBrowser: vi.fn(),
    fetchWithDetection: vi.fn(),
    parseProxyConfig: vi.fn(),
  };
});

// Mock the scrapers modules to test orchestration separately if needed,
// but for now we are testing the full flow so we'll mock the low-level fetch/puppeteer.
// actually, let's mock the implementation details (fetch/puppeteer) to test the scraper logic.

describe("Search Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (common.parseProxyConfig as Mock).mockReturnValue(null);
  });

  describe("searchGoogle", () => {
    it("should return results using google-sr library", async () => {
      const mockResults = [{ title: "Test Title", link: "https://example.com", description: "Test Snippet" }];
      (googleSrSearch as Mock).mockResolvedValue(mockResults);
      (common.fetchWithDetection as Mock).mockResolvedValue({ headers: {}, body: "html" });

      const results = await searchGoogle("test query");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "Test Title",
        url: "https://example.com",
        snippet: "Test Snippet",
        source: "google",
      });
    });

    it("should fallback to puppeteer if bot protection detected", async () => {
      // Mock fetchWithDetection to throw bot protection error
      const error = new Error("Bot protection detected");
      (common.fetchWithDetection as Mock).mockRejectedValue(error);

      // Mock puppeteer execution via createStealthBrowser
      const mockPage = {
        setViewport: vi.fn(),
        setExtraHTTPHeaders: vi.fn(),
        goto: vi.fn(),
        waitForSelector: vi.fn(),
        evaluate: vi
          .fn()
          .mockResolvedValue([
            { title: "Puppeteer Title", url: "https://pup.com", snippet: "Pup Snippet", source: "google" },
          ]),
        close: vi.fn(),
      };
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn(),
      };
      (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);

      const results = await searchGoogle("test query", { antiBot: { enabled: true } });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Puppeteer Title");
      expect(common.createStealthBrowser).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
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
      // Mock HTML scrape returning empty results (e.g. strict bot protection that returned valid HTML but no results)
      (common.fetchWithDetection as Mock).mockResolvedValue({
        headers: {},
        body: "<html><body>No results</body></html>",
      });

      // Mock puppeteer
      const mockPage = {
        setViewport: vi.fn(),
        setExtraHTTPHeaders: vi.fn(),
        goto: vi.fn(),
        waitForSelector: vi.fn(),
        evaluate: vi
          .fn()
          .mockResolvedValue([
            { title: "Puppeteer DDG", url: "https://ddg-pup.com", snippet: "Snippet", source: "duckduckgo" },
          ]),
        close: vi.fn(),
      };
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn(),
      };
      (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);

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
      // 2. Fallback to Puppeteer -> throws error
      (common.fetchWithDetection as Mock)
        .mockRejectedValueOnce(new Error("DDG Fetch Fail")) // DDG HTML
        .mockResolvedValueOnce({ headers: {}, body: "google html" }); // Google Fetch (for next step)

      // Mock createStealthBrowser to throw for DDG puppeteer attempt to simulate full failure
      (common.createStealthBrowser as Mock).mockRejectedValueOnce(new Error("DDG Puppeteer Fail"));

      // Mock Google Success
      (googleSrSearch as Mock).mockResolvedValue([
        { title: "Google", link: "https://google.com", description: "desc" },
      ]);

      const results = await search("fallback");
      expect(results[0].source).toBe("google");
    });

    it("should fallback to SearxNG if Google fails", async () => {
      // Fail DDG (Fetch + Puppeteer)
      (common.fetchWithDetection as Mock).mockRejectedValueOnce(new Error("DDG Fail"));
      (common.createStealthBrowser as Mock).mockRejectedValueOnce(new Error("DDG Puppeteer Fail"));

      // Fail Google (Fetch + Puppeteer)
      (common.fetchWithDetection as Mock).mockRejectedValueOnce(new Error("Google Fail"));
      (common.createStealthBrowser as Mock).mockRejectedValueOnce(new Error("Google Puppeteer Fail"));

      // SearxNG Success
      (common.fetchWithDetection as Mock).mockResolvedValueOnce({
        headers: {},
        body: JSON.stringify({ results: [{ title: "Searx", url: "https://s.com", content: "c" }] }),
      });

      const results = await search("deep fallback");
      expect(results[0].source).toBe("searxng");
    });
  });
});
