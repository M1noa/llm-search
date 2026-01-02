import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { cleanText, parseProxyConfig, detectBotProtection, isUrlAccessible } from "./common";

describe("Common Utilities", () => {
  describe("cleanText", () => {
    it("should remove excessive whitespace", () => {
      const input = "  Hello   world  \n\n  how are   you  ";
      expect(cleanText(input)).toBe("Hello world how are you");
    });

    it("should format sentences with newlines", () => {
      const input = "Hello world. How are you? I am fine!";
      const expected = "Hello world.\n\nHow are you?\n\nI am fine!";
      expect(cleanText(input)).toBe(expected);
    });

    it("should handle empty strings", () => {
      expect(cleanText("")).toBe("");
    });
  });

  describe("parseProxyConfig", () => {
    it("should return null for undefined", () => {
      expect(parseProxyConfig(undefined)).toBeNull();
    });

    it("should parse string proxy URL", () => {
      const proxy = "http://user:pass@host:8080";
      const result = parseProxyConfig(proxy);
      expect(result).toEqual({
        url: "http://user:pass@host:8080",
        type: "http",
      });
    });

    it("should parse object proxy config", () => {
      const proxy = {
        type: "socks5" as const,
        host: "localhost",
        port: 9050,
        auth: {
          username: "user",
          password: "pass",
        },
      };
      const result = parseProxyConfig(proxy);
      expect(result).toEqual({
        url: "socks5://user:pass@localhost:9050",
        type: "socks5",
      });
    });

    it("should throw error for invalid proxy string", () => {
      expect(() => parseProxyConfig("not-a-url")).toThrow("Invalid proxy URL format");
    });
  });

  describe("detectBotProtection", () => {
    it("should return false for normal content", () => {
      expect(detectBotProtection({}, "<html><body>Normal content</body></html>")).toBe(false);
    });

    it("should detect Cloudflare", () => {
      expect(detectBotProtection({}, "Just a moment...")).toBe(true);
      expect(detectBotProtection({ "cf-ray": "123" }, "")).toBe(true);
    });

    it("should detect 403 forbidden", () => {
      expect(detectBotProtection({}, "403 Forbidden")).toBe(true);
    });
  });

  describe("isUrlAccessible", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it("should return true if fetch succeeds", async () => {
      (global.fetch as Mock).mockResolvedValue({ ok: true });
      const result = await isUrlAccessible("https://example.com");
      expect(result).toBe(true);
    });

    it("should return false if fetch fails", async () => {
      (global.fetch as Mock).mockRejectedValue(new Error("Network error"));
      const result = await isUrlAccessible("https://example.com");
      expect(result).toBe(false);
    });

    it("should return false if response is not ok", async () => {
      (global.fetch as Mock).mockResolvedValue({ ok: false });
      const result = await isUrlAccessible("https://example.com");
      expect(result).toBe(false);
    });
  });
});
