import yahooFinance from "yahoo-finance2";
import type { Quote } from "yahoo-finance2/modules/quote";
import { FinanceResult, SearchError } from "../../types";

export async function getStockQuote(symbol: string): Promise<FinanceResult> {
  try {
    // Explicitly cast to Quote to avoid type inference issues
    const quote = await yahooFinance.quote(symbol) as unknown as Quote;

    return {
      symbol: quote.symbol,
      shortName: quote.shortName,
      longName: quote.longName,
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent,
      regularMarketTime: quote.regularMarketTime,
      currency: quote.currency,
      exchange: quote.exchange,
      marketState: quote.marketState,
      source: "yahoo-finance",
    };
  } catch (error) {
    throw {
      message: `Failed to fetch quote for symbol: ${symbol}`,
      code: "FINANCE_QUOTE_ERROR",
      originalError: error,
    } as SearchError;
  }
}
