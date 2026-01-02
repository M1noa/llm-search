import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getQuote } from "./finance";
import { getStockQuote } from "./scrapers/yahoo-finance";
import yahooFinance from "yahoo-finance2";

// Mock dependencies
vi.mock("yahoo-finance2", () => {
  return {
    default: {
      quote: vi.fn(),
    },
  };
});

describe("Finance Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Yahoo Finance Scraper", () => {
    it("should return formatted finance results", async () => {
      const mockQuote = {
        symbol: "AAPL",
        shortName: "Apple Inc.",
        longName: "Apple Inc.",
        regularMarketPrice: 150.00,
        regularMarketChange: 2.50,
        regularMarketChangePercent: 1.69,
        regularMarketTime: new Date("2023-01-01"),
        currency: "USD",
        exchange: "NMS",
        marketState: "REGULAR",
      };

      (yahooFinance.quote as unknown as Mock).mockResolvedValue(mockQuote);

      const result = await getStockQuote("AAPL");

      expect(result).toEqual({
        symbol: "AAPL",
        shortName: "Apple Inc.",
        longName: "Apple Inc.",
        regularMarketPrice: 150.00,
        regularMarketChange: 2.50,
        regularMarketChangePercent: 1.69,
        regularMarketTime: mockQuote.regularMarketTime,
        currency: "USD",
        exchange: "NMS",
        marketState: "REGULAR",
        source: "yahoo-finance",
      });
    });

    it("should handle errors", async () => {
      (yahooFinance.quote as unknown as Mock).mockRejectedValue(new Error("API Error"));

      await expect(getStockQuote("INVALID")).rejects.toMatchObject({
        code: "FINANCE_QUOTE_ERROR",
        message: expect.stringContaining("Failed to fetch quote"),
      });
    });
  });

  describe("getQuote (Orchestrator)", () => {
    it("should return data from Yahoo Finance", async () => {
      const mockQuote = {
        symbol: "GOOGL",
        regularMarketPrice: 2800.00,
      };
      (yahooFinance.quote as unknown as Mock).mockResolvedValue(mockQuote);

      const result = await getQuote("GOOGL");

      expect(result.symbol).toBe("GOOGL");
      expect(result.source).toBe("yahoo-finance");
      expect(yahooFinance.quote).toHaveBeenCalledWith("GOOGL");
    });

    it("should propagate errors", async () => {
      (yahooFinance.quote as unknown as Mock).mockRejectedValue(new Error("Fail"));

      await expect(getQuote("ERROR")).rejects.toThrow();
    });
  });
});
