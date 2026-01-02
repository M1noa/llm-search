import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getTopStories, getStoryById } from "./hackernews";
import { wikiSearch, wikiGetContent, wikiGetSummary } from "./wikipedia";
import wiki from "wikipedia";

// Mock dependencies
vi.mock("wikipedia");

// Global fetch mock
global.fetch = vi.fn();

describe("Integrations Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("HackerNews", () => {
    it("should fetch top stories", async () => {
      // Mock ID list response
      (global.fetch as Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve([1, 2]),
        })
        // Mock Item 1
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ id: 1, title: "Story 1", url: "http://story1.com", score: 100 }),
        })
        // Mock Item 2
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ id: 2, title: "Story 2", url: "http://story2.com", score: 200 }),
        });

      const stories = await getTopStories(2);

      expect(stories).toHaveLength(2);
      expect(stories[0].title).toBe("Story 1");
      expect(stories[1].title).toBe("Story 2");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should fetch story by ID", async () => {
      (global.fetch as Mock).mockResolvedValue({
        json: () => Promise.resolve({ id: 123, title: "Specific Story", text: "Content" }),
      });

      const story = await getStoryById(123);

      expect(story.title).toBe("Specific Story");
      expect(story.snippet).toBe("Content");
    });

    it("should handle HN errors", async () => {
      (global.fetch as Mock).mockRejectedValue(new Error("API Error"));
      await expect(getStoryById(1)).rejects.toThrow("failed to get story");
    });
  });

  describe("Wikipedia", () => {
    it("should search wikipedia", async () => {
      const mockResults = {
        results: [{ title: "Result 1" }, { title: "Result 2" }],
      };
      const mockSummary = {
        title: "Result 1",
        extract: "Summary 1",
        thumbnail: { source: "img.jpg" },
      };

      (wiki.search as Mock).mockResolvedValue(mockResults);
      (wiki.summary as Mock).mockResolvedValue(mockSummary);

      const results = await wikiSearch("query", 2);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Result 1");
      expect(results[0].snippet).toBe("Summary 1");
      expect(wiki.search).toHaveBeenCalledWith("query", { limit: 2 });
    });

    it("should get wikipedia content", async () => {
      const mockPage = {
        content: vi.fn().mockResolvedValue("Page Content"),
      };
      (wiki.page as Mock).mockResolvedValue(mockPage);

      const content = await wikiGetContent("Test Page");

      expect(content).toBe("Page Content");
      expect(wiki.page).toHaveBeenCalledWith("Test Page");
    });

    it("should get wikipedia summary", async () => {
      (wiki.summary as Mock).mockResolvedValue({
        title: "Summary Title",
        extract: "Summary Text",
      });

      const summary = await wikiGetSummary("Test Page");

      expect(summary.title).toBe("Summary Title");
      expect(summary.extract).toBe("Summary Text");
    });

    it("should handle Wikipedia errors", async () => {
      (wiki.page as Mock).mockRejectedValue(new Error("Wiki Error"));
      await expect(wikiGetContent("Error Page")).rejects.toThrow("failed to get wikipedia content");
    });
  });
});
