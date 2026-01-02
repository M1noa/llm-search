import { describe, it, expect } from "vitest";
import { getWebpageContent } from "./modules/scrape";
import { wikiSearch, wikiGetContent } from "./modules/wikipedia";
import { getTopStories, getNewStories, getStoryById } from "./modules/hackernews";
import { parse } from "./modules/parser";
import { search, searchDuckDuckGo, searchGoogle } from "./modules/search";
import { searchMedia } from "./modules/media";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import type { SearchResult } from "./types";

/**
 * Comprehensive Integration Tests
 * These tests demonstrate actual output from each module
 */

describe("📦 LLM-Kit Integration Tests", () => {
  describe("🔍 Search Module", () => {
    it.skip("should search DuckDuckGo and return structured results", async () => {
      // Skipped: External API, hits bot protection during automated testing
      const results = await searchDuckDuckGo("typescript tutorial", { limit: 3 });

      console.log("\n📊 DuckDuckGo Search Results:");
      results.slice(0, 3).forEach((result: SearchResult, i: number) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   🔗 ${result.url}`);
        console.log(`   📝 ${result.snippet?.slice(0, 100)}...`);
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("url");
      expect(results[0]).toHaveProperty("snippet");
      expect(results[0].source).toBe("duckduckgo");
    }, 60000);

    it.skip("should search Google and return structured results", async () => {
      // Skipped: External API, hits bot protection during automated testing
      const results = await searchGoogle("typescript tutorial", { limit: 3 });

      console.log("\n📊 Google Search Results:");
      results.slice(0, 3).forEach((result: SearchResult, i: number) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   🔗 ${result.url}`);
        console.log(`   📝 ${result.snippet?.slice(0, 100)}...`);
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("url");
      expect(results[0]).toHaveProperty("snippet");
      expect(results[0].source).toBe("google");
    }, 60000);

    it.skip("should use unified search with fallback (requires internet)", async () => {
      // Skipped: External API, may hit rate limits during testing
      const results = await search("typescript tutorial", { limit: 3 });

      console.log("\n📊 Unified Search Results Sample:");
      console.log(JSON.stringify(results[0], null, 2));

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("url");
      expect(results[0]).toHaveProperty("snippet");
      expect(results[0]).toHaveProperty("source");
    }, 60000);
  });

  describe("📰 Wikipedia Module", () => {
    it.skip("should search Wikipedia and return results", async () => {
      const results = await wikiSearch("Node.js");

      console.log("\n📚 Wikipedia Search Results:");
      console.log(`Found ${results.length} results`);
      console.log(`First result: ${results[0].title}`);
      console.log(`Extract: ${results[0].extract?.slice(0, 100)}...`);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("url");
      expect(results[0]).toHaveProperty("extract");
    }, 15000);

    it.skip("should get Wikipedia page content", async () => {
      const content = await wikiGetContent("Node.js");

      console.log("\n📄 Wikipedia Content Sample:");
      console.log(`Length: ${content.length} characters`);
      console.log(`Preview: ${content.slice(0, 200)}...`);

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(100);
    }, 15000);
  });

  describe("🗞️ HackerNews Module", () => {
    it("should fetch top stories", async () => {
      const stories = await getTopStories(3);

      console.log("\n🔥 HackerNews Top Stories:");
      stories.forEach((story, i) => {
        console.log(`${i + 1}. ${story.title}`);
        console.log(`   👤 by ${story.author} | ⬆️ ${story.points} points | 💬 ${story.comments} comments`);
      });

      expect(stories).toBeDefined();
      expect(stories.length).toBe(3);
      expect(stories[0]).toHaveProperty("title");
      expect(stories[0]).toHaveProperty("url");
      expect(stories[0]).toHaveProperty("points");
      expect(stories[0]).toHaveProperty("author");
    }, 15000);

    it("should fetch story by ID", async () => {
      const topStories = await getTopStories(1);

      expect(topStories[0]).toBeDefined();
      expect(topStories[0].id).toBeDefined();

      if (!topStories[0].id) return;

      const story = await getStoryById(topStories[0].id);

      console.log("\n📖 HackerNews Story Details:");
      console.log(JSON.stringify(story, null, 2));

      expect(story).toHaveProperty("title");
      expect(story).toHaveProperty("url");
    }, 15000);
  });

  describe("🌐 Scraper Module - Enhanced Features", () => {
    it("should extract comprehensive webpage content", async () => {
      const content = await getWebpageContent("https://example.com");

      console.log("\n🎯 Webpage Extraction Results:");
      console.log(`Title: ${content.title}`);
      console.log(`Site: ${content.siteName || "N/A"}`);
      console.log(`Favicon: ${content.favicon || "N/A"}`);
      console.log(`Images: ${content.imageUrls?.length || 0} found`);
      console.log(`Text Length: ${content.textContent.length} chars`);
      console.log(`Markdown Length: ${content.markdown?.length || 0} chars`);
      console.log(`\nText Preview: ${content.textContent.slice(0, 150)}...`);
      console.log(`\nMarkdown Preview:\n${content.markdown?.slice(0, 200)}...`);

      expect(content).toHaveProperty("title");
      expect(content).toHaveProperty("content");
      expect(content).toHaveProperty("textContent");
      expect(content).toHaveProperty("markdown");
      expect(content).toHaveProperty("favicon");
      expect(content).toHaveProperty("imageUrls");
      expect(content).toHaveProperty("rawHtml");
    }, 30000);

    it.skip("should handle Wikipedia URLs with image extraction", async () => {
      const content = await getWebpageContent("https://en.wikipedia.org/wiki/TypeScript");

      console.log("\n📚 Wikipedia Page Extraction:");
      console.log(`Title: ${content.title}`);
      console.log(`Images found: ${content.imageUrls?.length || 0}`);
      if (content.imageUrls && content.imageUrls.length > 0) {
        console.log(`Sample images:`);
        content.imageUrls.slice(0, 3).forEach((img, i) => {
          console.log(`  ${i + 1}. ${img}`);
        });
      }

      expect(content.siteName).toBe("Wikipedia");
      expect(content.markdown).toBeDefined();
    }, 30000);
  });

  describe("📄 Parser Module - File Support", () => {
    it("should parse various file types", async () => {
      const testData = "Sample,CSV,Data\n1,2,3\n4,5,6";
      const csvPath = join(process.cwd(), "test-sample.csv");

      // Create a temporary CSV for testing
      writeFileSync(csvPath, testData);

      try {
        const result = await parse(csvPath);

        console.log("\n📊 CSV Parser Output:");
        console.log(`Type: ${result.type}`);
        console.log(`Text: ${result.text}`);
        console.log(`Rows: ${result.metadata?.rowCount || "N/A"}`);

        expect(result.type).toBe("csv");
        expect(result.text).toContain("Sample");
      } finally {
        // Cleanup
        unlinkSync(csvPath);
      }
    });

    it("should handle plain text files", async () => {
      const testText = "This is a test text file.\nWith multiple lines.\n";
      const txtPath = join(process.cwd(), "test-sample.txt");

      writeFileSync(txtPath, testText);

      try {
        const result = await parse(txtPath);

        console.log("\n📝 Text Parser Output:");
        console.log(`Type: ${result.type}`);
        console.log(`Content: ${result.text}`);

        expect(result.type).toBe("text");
        expect(result.text).toBe(testText);
      } finally {
        unlinkSync(txtPath);
      }
    });

    it("should parse JSON files", async () => {
      const testJson = { name: "Test", value: 42, nested: { key: "value" } };
      const jsonPath = join(process.cwd(), "test-sample.json");

      writeFileSync(jsonPath, JSON.stringify(testJson, null, 2));

      try {
        const result = await parse(jsonPath);

        console.log("\n🔧 JSON Parser Output:");
        console.log(`Type: ${result.type}`);
        console.log(`Data:`, result.data);

        expect(result.type).toBe("json");
        expect(result.data).toEqual(testJson);
      } finally {
        unlinkSync(jsonPath);
      }
    });
  });

  describe("🎬 Media Module", () => {
    it.skip("should search for movies/tv/anime", async () => {
      // Skipped: External scraping, avoids hitting rate limits/blocks in automated tests
      const results = await searchMedia("Breaking Bad", { type: "tv", limit: 1 });

      console.log("\n🎬 Media Search Results:");
      if (results.length > 0) {
        const show = results[0];
        console.log(`Title: ${show.title}`);
        console.log(`URL: ${show.url}`);
        console.log(`Rating: ${show.rating}`);
        console.log(`Description: ${show.description?.slice(0, 100)}...`);
      }

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Breaking Bad");
      expect(results[0].mediaType).toBe("tv");
    }, 30000);
  });

  describe("🎨 Output Format Examples", () => {
    it("should demonstrate WebpageContent structure", async () => {
      const content = await getWebpageContent("https://example.com");

      console.log("\n📋 Complete WebpageContent Structure:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        JSON.stringify(
          {
            title: content.title,
            siteName: content.siteName,
            favicon: content.favicon,
            excerpt: content.excerpt?.slice(0, 100),
            textContentLength: content.textContent.length,
            markdownLength: content.markdown?.length,
            imageCount: content.imageUrls?.length,
            sampleImage: content.imageUrls?.[0],
          },
          null,
          2,
        ),
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      expect(content).toBeDefined();
    }, 30000);
  });
});
