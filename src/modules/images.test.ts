import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { search } from "./search";
import { searchDuckDuckGo } from "./scrapers/duckduckgo";
import { searchGoogle } from "./scrapers/google";
import { searchSearxNG } from "./scrapers/searxng";
import * as common from "./common";
import type { Browser } from "puppeteer";

// Mock common module
vi.mock("./common", async () => {
  const actual = await vi.importActual<typeof import("./common")>("./common");
  return {
    ...actual,
    createStealthBrowser: vi.fn(),
    fetchWithDetection: vi.fn(),
  };
});

describe("Image Search Integration", () => {
  // Mock types
  interface MockPage {
    setViewport: Mock;
    setExtraHTTPHeaders: Mock;
    goto: Mock;
    waitForSelector: Mock;
    evaluate: Mock;
    close: Mock;
  }

  interface MockBrowser {
    newPage: Mock;
    close: Mock;
  }

  let mockPage: MockPage;
  let mockBrowser: MockBrowser;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      setViewport: vi.fn(),
      setExtraHTTPHeaders: vi.fn(),
      goto: vi.fn(),
      waitForSelector: vi.fn(),
      evaluate: vi.fn(),
      close: vi.fn(),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };

    vi.spyOn(common, "createStealthBrowser").mockResolvedValue(mockBrowser as unknown as Browser);
  });

  it("should search google images correctly", async () => {
    const mockImages = [
      {
        title: "Test Image",
        url: "https://example.com/page",
        snippet: "Test Image",
        imageUrl: "https://example.com/image.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        source: "google-images",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockImages);

    const results = await searchGoogle("cats", { category: "images" });

    expect(common.createStealthBrowser).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("google.com/search?q=cats&tbm=isch"),
      expect.any(Object),
    );
    expect(results).toEqual(mockImages);
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
