import { FinanceResult } from "../types";
import { getStockQuote } from "./scrapers/yahoo-finance";

// Re-export specific finance functions
export { getStockQuote } from "./scrapers/yahoo-finance";

/**
 * Get a stock quote for a given symbol.
 * Currently uses Yahoo Finance as the primary source.
 *
 * @param symbol The stock symbol (e.g., "AAPL", "GOOGL")
 * @returns Promise<FinanceResult>
 */
export async function getQuote(symbol: string): Promise<FinanceResult> {
  // 1. Try Yahoo Finance (primary source)
  try {
    return await getStockQuote(symbol);
  } catch (err) {
    // If we had other providers (e.g. Google Finance), we would fallback here
    // For now, just re-throw
    throw err;
  }
}
