import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { searchNews } from "./news";
import { searchGoogleNews } from "./scrapers/google-news";
import { searchDuckDuckGo } from "./scrapers/duckduckgo";
import googleNewsScraper from "google-news-scraper";

// Mock dependencies
vi.mock("google-news-scraper");
vi.mock("./scrapers/duckduckgo");
vi.mock("./scrapers/google-news", async () => {
  const actual = await vi.importActual<typeof import("./scrapers/google-news")>("./scrapers/google-news");
  return {
    ...actual,
    // We want to test the real implementation of searchGoogleNews sometimes,
    // but for searchNews orchestrator tests we might want to mock it.
    // However, since searchGoogleNews is simple, we can mock the underlying library instead.
  };
});

describe("News Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("searchGoogleNews", () => {
    it("should return formatted news results", async () => {
      const mockArticles = [
        {
          title: "Test News",
          link: "https://news.com/article",
          image: "https://news.com/image.jpg",
          source: "News Source",
          time: "2 hours ago",
          subtitle: "Snippet text",
        },
      ];

      (googleNewsScraper as unknown as Mock).mockResolvedValue(mockArticles);

      const results = await searchGoogleNews("test google news");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "Test News",
        url: "https://news.com/article",
        imageUrl: "https://news.com/image.jpg",
        source: "google-news",
        sourceName: "News Source",
        publishedAt: "2 hours ago",
        snippet: "Snippet text",
      });
    });

    it("should handle errors", async () => {
      (googleNewsScraper as unknown as Mock).mockRejectedValue(new Error("Scrape failed"));

      await expect(searchGoogleNews("test error")).rejects.toMatchObject({
        code: "GOOGLE_NEWS_SEARCH_ERROR",
      });
    });
  });

  describe("searchNews (Orchestrator)", () => {
    it("should try Google News first", async () => {
      const mockArticles = [{ title: "GNews", link: "url", source: "G" }];
      (googleNewsScraper as unknown as Mock).mockResolvedValue(mockArticles);

      const results = await searchNews("test orchestrator");

      expect(results[0].source).toBe("google-news");
      expect(googleNewsScraper).toHaveBeenCalled();
      expect(searchDuckDuckGo).not.toHaveBeenCalled();
    });

    it("should fallback to DuckDuckGo if Google News fails", async () => {
      // Mock Google News failure
      (googleNewsScraper as unknown as Mock).mockRejectedValue(new Error("Fail"));

      // Mock DDG success
      (searchDuckDuckGo as Mock).mockResolvedValue([
        { title: "DDG News", url: "url", snippet: "desc", source: "duckduckgo" },
      ]);

      const results = await searchNews("test fallback");

      expect(results[0].source).toBe("duckduckgo-news");
      expect(googleNewsScraper).toHaveBeenCalled();
      expect(searchDuckDuckGo).toHaveBeenCalledWith("test fallback", expect.objectContaining({ category: "news" }));
    });

    it("should throw if all providers fail", async () => {
      (googleNewsScraper as unknown as Mock).mockRejectedValue(new Error("Fail 1"));
      (searchDuckDuckGo as Mock).mockRejectedValue(new Error("Fail 2"));

      await expect(searchNews("test all fail")).rejects.toMatchObject({
        code: "ALL_NEWS_ENGINES_FAILED",
      });
    });
  });
});
