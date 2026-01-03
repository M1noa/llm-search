import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { search } from "./search";
import { searchDuckDuckGo } from "./scrapers/duckduckgo";
import { searchGoogle } from "./scrapers/google";
import { searchSearxNG } from "./scrapers/searxng";
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
  newContext: Mock; // Playwright specific
  newPage: Mock; // Puppeteer specific
  close: Mock;
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

// Mock common module
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

describe("Image Search Integration", () => {
  let mockBrowser: MockBrowser;
  let mockContext: MockContext;
  let mockPage: MockPage;

  beforeEach(() => {
    vi.clearAllMocks();
    (common.parseProxyConfig as Mock).mockReturnValue(null);

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
      newContext: vi.fn().mockResolvedValue(mockContext), // For Playwright
      newPage: vi.fn().mockResolvedValue(mockPage), // For Puppeteer
      close: vi.fn(),
    };

    // Setup Playwright mock
    (chromium.launch as Mock).mockResolvedValue(mockBrowser);

    // Setup Puppeteer mock
    (common.createStealthBrowser as Mock).mockResolvedValue(mockBrowser);
  });

  it("should search google images correctly", async () => {
    const rawResults = [
      {
        title: "Test Image",
        link: "https://example.com/page",
        snippet: "Test Image",
        imageUrl: "https://example.com/image.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
      },
    ];

    const expectedResults = [
      {
        title: "Test Image",
        url: "https://example.com/page",
        snippet: "Test Image",
        imageUrl: "https://example.com/image.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        source: "google-images",
      },
    ];

    // Mock search input found for Playwright
    mockPage.$.mockResolvedValue({
      click: vi.fn(),
    });

    mockPage.evaluate.mockResolvedValue(rawResults);

    const results = await searchGoogle("cats", { category: "images" });

    expect(chromium.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringMatching(/google\.[a-z.]+\/search\?q=cats&tbm=isch/),
      expect.any(Object),
    );
    expect(results).toEqual(expectedResults);
  });

  it("should search duckduckgo images correctly", async () => {
    const mockImages = [
      {
        title: "Test DDG Image",
        url: "https://example.com/ddg-page",
        snippet: "Test DDG Image",
        imageUrl: "https://example.com/ddg-image.jpg",
        thumbnailUrl: "https://example.com/ddg-image.jpg",
        source: "duckduckgo-images",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockImages);

    const results = await searchDuckDuckGo("dogs", { category: "images" });

    expect(common.createStealthBrowser).toHaveBeenCalled();
    // DDG image search url param
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("duckduckgo.com/?q=dogs&iax=images&ia=images"),
      expect.any(Object),
    );
    expect(results).toEqual(mockImages);
  });

  it("should search searxng images correctly", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test SearxNG Image",
          url: "https://example.com/searx-page",
          content: "Test SearxNG Image",
          img_src: "https://example.com/searx-image.jpg",
          thumbnail_src: "https://example.com/searx-thumb.jpg",
        },
      ],
    };

    (common.fetchWithDetection as Mock).mockResolvedValue({
      headers: {},
      body: JSON.stringify(mockResponse),
    });

    const results = await searchSearxNG("lizards", { category: "images" });

    expect(common.fetchWithDetection).toHaveBeenCalledWith(
      expect.stringContaining("categories=images"),
      expect.any(Object),
    );

    expect(results[0]).toMatchObject({
      title: "Test SearxNG Image",
      imageUrl: "https://example.com/searx-image.jpg",
      source: "searxng-images",
    });
  });

  it("should delegate to scrapers via main search function", async () => {
    const mockImages = [
      {
        title: "Test DDG Image",
        url: "https://example.com/ddg-page",
        snippet: "Test DDG Image",
        imageUrl: "https://example.com/ddg-image.jpg",
        thumbnailUrl: "https://example.com/ddg-image.jpg",
        source: "duckduckgo-images",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockImages);

    // Should default to DDG first
    const results = await search("birds", { category: "images" });

    expect(results[0].source).toContain("images");
  });
});
