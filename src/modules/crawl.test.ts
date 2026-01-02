import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { crawl } from "./crawl";
import { CheerioCrawler, PuppeteerCrawler } from "crawlee";

// Mock crawlee
vi.mock("crawlee", async () => {
  const actual = await vi.importActual("crawlee");
  return {
    ...actual,
    CheerioCrawler: vi.fn(),
    PuppeteerCrawler: vi.fn(),
    Configuration: vi.fn(),
  };
});

describe("Crawl Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation for run
    (CheerioCrawler as unknown as Mock).mockImplementation(() => ({
      run: vi.fn().mockResolvedValue(undefined),
    }));
    (PuppeteerCrawler as unknown as Mock).mockImplementation(() => ({
      run: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it("should use CheerioCrawler by default", async () => {
    const results = await crawl("https://example.com");

    expect(CheerioCrawler).toHaveBeenCalled();
    expect(PuppeteerCrawler).not.toHaveBeenCalled();
    expect(results).toEqual([]); // Empty because we mocked run and didn't populate results
  });

  it("should use PuppeteerCrawler when requested", async () => {
    await crawl("https://example.com", { crawlType: "puppeteer" });

    expect(PuppeteerCrawler).toHaveBeenCalled();
    expect(CheerioCrawler).not.toHaveBeenCalled();
  });

  it("should use PuppeteerCrawler when forcePuppeteer is true", async () => {
    await crawl("https://example.com", { forcePuppeteer: true });

    expect(PuppeteerCrawler).toHaveBeenCalled();
  });

  it("should configure crawler with maxPages", async () => {
    await crawl("https://example.com", { maxPages: 5 });

    expect(CheerioCrawler).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRequestsPerCrawl: 5,
      }),
      expect.any(Object),
    );
  });
});
